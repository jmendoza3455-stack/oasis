"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { dbErrorCode, withDb } from "@/lib/db";
import {
  marketingFileExists,
  marketingUploadUrl,
  MARKETING_TYPES,
  validateMarketingUpload,
} from "@/lib/storage";
import { activeVenue } from "@/server/venue";

export type MarketingResult = { ok: boolean; message: string };

const fileSchema = z.object({
  filename: z.string().trim().min(1).max(160),
  type: z.string(),
  size: z.number().int().positive(),
});

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-60);

/** Paso 1 de la subida: valida y entrega una URL firmada para subir directo desde el celular. */
export async function requestClipUpload(
  input: z.input<typeof fileSchema>,
): Promise<{ ok: true; key: string; url: string } | { ok: false; message: string }> {
  await requireStaff();
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Archivo inválido." };
  const invalid = validateMarketingUpload(parsed.data);
  if (invalid) return { ok: false, message: invalid };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" })
    .format(new Date())
    .replaceAll("-", "");
  const base = slug(parsed.data.filename.replace(/\.[^.]+$/, "")) || "clip";
  const key = `clips/${day}/${randomUUID().slice(0, 8)}-${base}.${MARKETING_TYPES[parsed.data.type]}`;
  return { ok: true, key, url: await marketingUploadUrl(key) };
}

/** Paso 2: registra el clip ya subido (con lo que muestra, para que el editor lo encuentre). */
export async function confirmClipUpload(
  input: z.input<typeof fileSchema> & { key: string; notes?: string },
): Promise<MarketingResult> {
  const user = await requireStaff();
  const parsed = fileSchema
    .extend({
      key: z.string().regex(/^clips\/\d{8}\/[a-z0-9.-]+$/),
      notes: z.string().trim().max(300).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Datos de subida inválidos." };
  const d = parsed.data;
  if (!(await marketingFileExists(d.key)))
    return { ok: false, message: "El archivo no llegó. Revisa tu conexión e inténtalo de nuevo." };
  const venue = await activeVenue();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into marketing_clips (venue_id, storage_key, filename, content_type, size_bytes, notes, uploaded_by)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [venue.id, d.key, d.filename, d.type, d.size, d.notes || null, user.id],
    ),
  );
  refresh();
  return { ok: true, message: "Clip subido." };
}

/** Aprobar, pedir cambios (con comentario) o descartar. Solo el admin (RLS + trigger). */
export async function decidePiece(
  _: MarketingResult | null,
  formData: FormData,
): Promise<MarketingResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      decision: z.enum(["approved", "changes", "discarded"]),
      feedback: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Decisión inválida." };
  const { id, decision, feedback } = parsed.data;
  if (decision === "changes" && !feedback)
    return { ok: false, message: "Escribe qué cambiar para que el equipo lo rehaga." };
  try {
    await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql(
        `update marketing_pieces set status = $2, feedback = coalesce($3, feedback), decided_by = $4 where id = $1`,
        [id, decision, feedback || null, user.id],
      ),
    );
  } catch (error) {
    return {
      ok: false,
      message:
        dbErrorCode(error) === "invalid_piece_transition"
          ? "La pieza ya cambió de estado. Recarga la página."
          : "No se pudo guardar la decisión.",
    };
  }
  refresh();
  return {
    ok: true,
    message:
      decision === "approved"
        ? "Aprobada: queda lista para publicar."
        : decision === "changes"
          ? "Enviada a cambios: el equipo la rehace."
          : "Descartada.",
  };
}

const url = z.union([z.literal(""), z.url().startsWith("https://")]);

/** Marca la pieza como publicada con sus enlaces (para medirla después). */
export async function publishPiece(
  _: MarketingResult | null,
  formData: FormData,
): Promise<MarketingResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      instagram: url.optional(),
      tiktok: url.optional(),
      facebook: url.optional(),
      google: url.optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Los enlaces deben empezar con https://." };
  const { id, ...links } = parsed.data;
  const urls = Object.fromEntries(Object.entries(links).filter(([, v]) => v));
  try {
    await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql(
        `update marketing_pieces set status = 'published', published_urls = $2, decided_by = $3 where id = $1`,
        [id, JSON.stringify(urls), user.id],
      ),
    );
  } catch {
    return { ok: false, message: "Solo se publica una pieza aprobada." };
  }
  refresh();
  return { ok: true, message: "Marcada como publicada." };
}

const count = z.union([z.literal("").transform(() => undefined), z.coerce.number().int().min(0)]);

/** Resultados de la pieza (se cargan a los 7 días desde Instagram/TikTok). */
export async function savePieceMetrics(
  _: MarketingResult | null,
  formData: FormData,
): Promise<MarketingResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      reach: count.optional(),
      views: count.optional(),
      saves: count.optional(),
      shares: count.optional(),
      link_clicks: count.optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Usa números enteros." };
  const { id, ...m } = parsed.data;
  const metrics = Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined));
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update marketing_pieces set metrics = metrics || $2::jsonb || jsonb_build_object('measured_at', now()) where id = $1`,
      [id, JSON.stringify(metrics)],
    ),
  );
  refresh();
  return { ok: true, message: "Resultados guardados." };
}
