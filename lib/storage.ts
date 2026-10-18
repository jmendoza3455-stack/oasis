import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { devAuthEnabled } from "@/lib/auth/session";

// Archivos privados (vouchers, contratos firmados, fotos de actas e incidencias).
// Producción: bucket privado "documents" de Supabase Storage (URLs firmadas de 10 min).
// Local/CI: carpeta .storage/ servida solo a staff por /admin/archivos.

const BUCKET = "documents";
const LOCAL_ROOT = path.join(process.cwd(), ".storage");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const localMode = () => devAuthEnabled() || !process.env.SUPABASE_SERVICE_ROLE_KEY;

export function validateUpload(file: File): string | null {
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_UPLOAD_BYTES) return "El archivo supera 10 MB.";
  if (!ALLOWED_TYPES[file.type]) return "Formato no permitido: usa JPG, PNG, WEBP o PDF.";
  return null;
}

export async function putFile(key: string, file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (localMode()) {
    const target = path.join(LOCAL_ROOT, key);
    if (!target.startsWith(LOCAL_ROOT)) throw new Error("ruta inválida");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    return key;
  }
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(key, bytes, { contentType: file.type, upsert: false });
  if (error) throw error;
  return key;
}

export async function fileUrl(key: string): Promise<string> {
  if (localMode()) return `/admin/archivos?key=${encodeURIComponent(key)}`;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(key, 600);
  if (error) throw error;
  return data.signedUrl;
}

export async function readLocalFile(key: string): Promise<Buffer> {
  const target = path.join(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT)) throw new Error("ruta inválida");
  return readFile(target);
}
