// Script para verificar los archivos en Supabase Storage y DB
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkStorage() {
  console.log("🔍 Verificando archivos en reservation_attachments...\n");

  // 1. Obtener registros de la DB
  const { data: attachments, error } = await supabase
    .from("reservation_attachments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("❌ Error al obtener attachments:", error);
    return;
  }

  console.log("📦 Registros en DB:", attachments.length);

  for (const att of attachments) {
    console.log("\n---");
    console.log("ID:", att.id);
    console.log("File name:", att.file_name);
    console.log("File path:", att.file_path);
    console.log("Stop ID:", att.stop_id);

    // Intentar generar URL firmada
    const { data: urlData, error: urlError } = await supabase.storage
      .from("reservation-attachments")
      .createSignedUrl(att.file_path, 3600);

    if (urlError) {
      console.log("❌ Error generando URL:", urlError.message);
    } else if (urlData?.signedUrl) {
      console.log(
        "✅ URL generada:",
        urlData.signedUrl.substring(0, 80) + "..."
      );
    } else {
      console.log("⚠️ URL es null");
    }
  }

  // 2. Listar archivos en el bucket
  console.log(
    "\n\n🗂️ Listando archivos en bucket reservation-attachments...\n"
  );

  const { data: files, error: listError } = await supabase.storage
    .from("reservation-attachments")
    .list("", {
      limit: 100,
      offset: 0,
    });

  if (listError) {
    console.error("❌ Error al listar archivos:", listError);
  } else {
    console.log("📁 Archivos en bucket:", files.length);
    files.forEach((file) => {
      console.log("  -", file.name);
    });
  }
}

checkStorage()
  .then(() => {
    console.log("\n✅ Verificación completada");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
