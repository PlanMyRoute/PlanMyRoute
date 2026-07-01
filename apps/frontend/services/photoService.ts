import { supabase, supabaseUrl } from "@/lib/supabase";
// Use legacy import to avoid deprecation warning for readAsStringAsync
import * as FileSystem from "expo-file-system/legacy";

const BUCKET = "trip-photos";

/** Convierte una cadena base64 a un Uint8Array */
async function base64ToUint8Array(base64: string) {
  let binaryString: string;
  if (typeof atob === "function") {
    binaryString = atob(base64);
  } else if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return new Uint8Array(buf);
  } else {
    binaryString = globalThis.atob ? globalThis.atob(base64) : "";
  }

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Convierte una URI (local o remota) a un Blob */
async function uriToBlob(uri: string) {
  if (!uri) throw new Error("URI inválida proporcionada a uriToBlob");

  if (uri.startsWith("http") || uri.startsWith("https")) {
    const resp = await fetch(uri);
    return await resp.blob();
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    } as any);
    const uint8 = await base64ToUint8Array(base64);
    return new Blob([uint8], { type: "image/jpeg" });
  } catch (e) {
    try {
      const resp = await fetch(uri);
      return await resp.blob();
    } catch (err) {
      console.error("uriToBlob falló para", uri, err);
      throw err;
    }
  }
}

/** Servicio para gestionar fotos de viajes en Supabase Storage */
export class PhotoService {
  /** Obtiene todas las fotos de un viaje */
  static async getPhotos(tripId: string) {
    const { data, error } = await supabase
      .from("trip_photos")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const photos = (data as any[]).map((p) => {
      const url =
        p.url ||
        supabase.storage.from(BUCKET).getPublicUrl(p.path).data.publicUrl;
      return { ...p, url };
    });

    return photos;
  }

  /** Sube una foto a un viaje */
  static async uploadPhoto(tripId: string, uri: string) {
    try {
      const blob = await uriToBlob(uri);
      const filename = `${tripId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;

      try {
        const uploadResult = await supabase.storage
          .from(BUCKET)
          .upload(filename, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadResult.error) throw uploadResult.error;
      } catch (e) {
        console.warn(
          "supabase.storage.upload falló, intentando PUT directo",
          e,
        );

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          console.error("No hay token de sesión para la subida directa");
          throw e;
        }

        const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`;
        let bodyToSend: any = blob;
        try {
          if (blob.arrayBuffer) {
            bodyToSend = await blob.arrayBuffer();
          }
        } catch (_) {}

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "image/jpeg",
            "x-upsert": "false",
          },
          body: bodyToSend,
        });

        if (!putRes.ok) {
          const text = await putRes.text().catch(() => "sin-cuerpo");
          console.error("PUT directo falló", putRes.status, text);
          throw new Error(`PUT directo falló ${putRes.status} ${text}`);
        }
      }

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(filename)
        .data.publicUrl;

      const { error: dbError } = await supabase
        .from("trip_photos")
        .insert([{ trip_id: tripId, path: filename, url: publicUrl }]);
      if (dbError) {
        await supabase.storage.from(BUCKET).remove([filename]);
        throw dbError;
      }

      return { path: filename, url: publicUrl };
    } catch (err: any) {
      console.error("uploadPhoto falló", err);
      throw err;
    }
  }

  /** Elimina una foto de un viaje */
  static async deletePhoto(id: string, path: string) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (removeError) throw removeError;

    const { error: dbError } = await supabase
      .from("trip_photos")
      .delete()
      .eq("id", id);
    if (dbError) throw dbError;

    return true;
  }
}
