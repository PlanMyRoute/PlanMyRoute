import { supabase, supabaseUrl } from '@/lib/supabase';
// Use legacy import to avoid deprecation warning for readAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET = 'trip-photos';

export async function getPhotos(tripId: string) {
  console.log('📥 getPhotos - tripId:', tripId);
  const { data, error } = await supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
  if (error) {
    console.error('❌ Error loading photos:', error);
    throw error;
  }

  console.log('📸 Photos from DB:', data?.length, 'photos');
  
  // For each item, if url missing try to build public url
  const photos = (data as any[]).map((p) => {
    const url = p.url || supabase.storage.from(BUCKET).getPublicUrl(p.path).data.publicUrl;
    console.log('🖼️ Photo:', { id: p.id, path: p.path, urlFromDB: p.url, finalUrl: url });
    return {
      ...p,
      url,
    };
  });
  
  return photos;
}

async function base64ToUint8Array(base64: string) {
  // Try to use atob if available
  let binaryString: string;
  if (typeof atob === 'function') {
    binaryString = atob(base64);
  } else if (typeof Buffer !== 'undefined') {
    // Node/Buffer fallback (some RN environments polyfill Buffer)
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf);
  } else {
    // Fallback: decode manually
    binaryString = globalThis.atob ? globalThis.atob(base64) : '';
  }

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function uriToBlob(uri: string) {
  if (!uri) throw new Error('Invalid uri passed to uriToBlob');

  // If it's a remote URL, fetch normally
  if (uri.startsWith('http') || uri.startsWith('https')) {
    const resp = await fetch(uri);
    return await resp.blob();
  }

  // Otherwise assume local file (expo file system). Read as base64 and convert to Blob
  try {
    // Some versions of expo-file-system don't expose EncodingType in types;
    // pass the literal string to avoid TypeScript errors while maintaining runtime behavior.
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' } as any);
    const uint8 = await base64ToUint8Array(base64);
    // Create a blob from the uint8 array
    const blob = new Blob([uint8], { type: 'image/jpeg' });
    return blob;
  } catch (e) {
    // As a last resort try fetch (some environments support file:// fetch)
    try {
      const resp = await fetch(uri);
      return await resp.blob();
    } catch (err) {
      console.error('uriToBlob failed for', uri, err);
      throw err;
    }
  }
}

export async function uploadPhoto(tripId: string, uri: string) {
  try {
    const blob = await uriToBlob(uri);
    const filename = `${tripId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;

    // Try native supabase upload first
    try {
      const uploadResult = await supabase.storage.from(BUCKET).upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
      if (uploadResult.error) {
        console.debug('supabase upload error (will try fallback)', uploadResult.error);
        throw uploadResult.error;
      }
    } catch (e) {
      console.warn('supabase.storage.upload failed, attempting direct PUT fallback', e);

      // Fallback: perform direct PUT to Storage REST endpoint using session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        console.error('No session token available for fallback upload');
        throw e;
      }

      const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`;
      // blob may be a JS Blob or Uint8Array; ensure we send ArrayBuffer or Uint8Array
      let bodyToSend: any = blob;
      try {
        if (blob.arrayBuffer) {
          bodyToSend = await blob.arrayBuffer();
        }
      } catch (_) {}

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'false',
        },
        body: bodyToSend,
      });

      if (!putRes.ok) {
        const text = await putRes.text().catch(() => 'no-body');
        console.error('Direct PUT failed', putRes.status, text);
        throw new Error(`Direct PUT failed ${putRes.status} ${text}`);
      }
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;

    // Insert metadata in DB
    const { error: dbError } = await supabase.from('trip_photos').insert([{ trip_id: tripId, path: filename, url: publicUrl }]);
    if (dbError) {
      console.debug('supabase db insert error (rolling back object)', dbError);
      // Try to rollback storage upload if db insert fails
      await supabase.storage.from(BUCKET).remove([filename]);
      throw dbError;
    }

    return { path: filename, url: publicUrl };
  } catch (err: any) {
    console.warn('uploadPhoto failed', err);
    throw err;
  }
}

export async function deletePhoto(id: string, path: string) {
  // Remove from storage
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
  if (removeError) throw removeError;

  // Remove DB row
  const { error: dbError } = await supabase.from('trip_photos').delete().eq('id', id);
  if (dbError) throw dbError;

  return true;
}
