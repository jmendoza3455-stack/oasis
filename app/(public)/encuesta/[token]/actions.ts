"use server";

import { z } from "zod";
import { withDb } from "@/lib/db";
import { verifyNpsToken } from "@/lib/nps";

export type NpsState = { ok?: boolean; error?: string; reviewUrl?: string | null };

export async function submitNps(_: NpsState, formData: FormData): Promise<NpsState> {
  const bookingId = verifyNpsToken(String(formData.get("token") ?? ""));
  if (!bookingId) return { error: "El enlace no es válido." };
  const parsed = z
    .object({
      score: z.coerce.number().int().min(0).max(10),
      comment: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Elige una calificación del 0 al 10." };
  const result = await withDb({ kind: "service", actorName: "encuesta" }, async (sql) => {
    const rows = await sql<{ venueId: string }>(
      `insert into nps_responses (booking_id, score, comment)
       select id, $2, $3 from bookings where id = $1 and status in ('done', 'settled')
       on conflict (booking_id) do nothing returning (select venue_id from bookings where id = $1) as "venueId"`,
      [bookingId, parsed.data.score, parsed.data.comment || null],
    );
    if (rows.length === 0) return null;
    // A los promotores (9–10) se les ofrece dejar una reseña en Google, si el enlace está configurado
    if (parsed.data.score < 9) return { reviewUrl: null };
    const [setting] = await sql<{ url: string | null }>(
      `select value #>> '{}' as url from settings where venue_id = $1 and key = 'google_review_url'`,
      [rows[0].venueId],
    );
    return { reviewUrl: setting?.url && /^https:\/\//.test(setting.url) ? setting.url : null };
  });
  if (!result) return { error: "Esta encuesta ya fue respondida o el evento aún no se realiza." };
  return { ok: true, reviewUrl: result.reviewUrl };
}
