// Descarga todos los archivos del bucket privado "documents" a una carpeta (para el backup
// cifrado de GitHub Actions). Uso: node scripts/backup-storage.mts <carpeta-destino>
// Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { walkBucket } from "../lib/backup/walk.ts";

const BUCKET = "documents";
const out = path.resolve(process.argv[2] ?? "storage-backup");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET);

const files = await walkBucket(async (prefix, offset) => {
  const { data, error } = await storage.list(prefix, {
    limit: 100,
    offset,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  return (data ?? []).map((e) => ({ name: e.name, id: e.id ?? null }));
});

let bytes = 0;
for (const file of files) {
  const { data, error } = await storage.download(file);
  if (error || !data) throw error ?? new Error(`No se pudo descargar ${file}`);
  const target = path.join(out, file);
  if (!target.startsWith(out)) throw new Error(`Ruta inválida: ${file}`);
  await mkdir(path.dirname(target), { recursive: true });
  const buf = Buffer.from(await data.arrayBuffer());
  await writeFile(target, buf);
  bytes += buf.length;
}
console.log(`✓ ${files.length} archivos (${(bytes / 1024 / 1024).toFixed(1)} MB) en ${out}`);
