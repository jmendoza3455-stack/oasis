"use server";

import { z } from "zod";
import { withDb } from "@/lib/db";
import { verifyNpsToken } from "@/lib/nps";

export type NpsState = { ok?: boolean; error?: string };

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
  const rows = await withDb({ kind: "service", actorName: "encuesta" }, (sql) =>
    sql(
      `insert into nps_responses (booking_id, score, comment)
       select id, $2, $3 from bookings where id = $1 and status in ('done', 'settled')
       on conflict (booking_id) do nothing returning id`,
      [bookingId, parsed.data.score, parsed.data.comment || null],
    ),
  );
  if (rows.length === 0)
    return { error: "Esta encuesta ya fue respondida o el evento aún no se realiza." };
  return { ok: true };
}
