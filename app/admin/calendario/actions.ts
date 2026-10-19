"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { dbErrorCode, withDb } from "@/lib/db";
import { staffVenue } from "@/server/venue";

export type ActionResult = { ok: true } | { ok: false; error: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const blockSchema = z
  .object({
    startsOn: isoDate,
    endsOn: isoDate,
    kind: z.enum(["maintenance", "owner_use", "other"]),
    reason: z.string().trim().min(3, "Escribe el motivo del bloqueo.").max(200),
  })
  .refine((v) => v.endsOn >= v.startsOn, { message: "La fecha final no puede ser anterior." });

const MESSAGES: Record<string, string> = {
  date_taken: "Hay una reserva o bloqueo en esas fechas.",
};

export async function createBlock(input: z.input<typeof blockSchema>): Promise<ActionResult> {
  const user = await requireStaff();
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const venue = await staffVenue(user.id);
  try {
    await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql(
        `insert into blocks (venue_id, starts_on, ends_on, kind, reason) values ($1, $2, $3, $4, $5)`,
        [venue.id, parsed.data.startsOn, parsed.data.endsOn, parsed.data.kind, parsed.data.reason],
      ),
    );
  } catch (error) {
    const code = dbErrorCode(error);
    return { ok: false, error: MESSAGES[code] ?? "No se pudo crear el bloqueo." };
  }
  refresh();
  return { ok: true };
}

export async function deleteBlock(id: string): Promise<ActionResult> {
  const user = await requireStaff();
  const blockId = z.uuid().parse(id);
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(`delete from blocks where id = $1`, [blockId]),
  );
  refresh();
  return { ok: true };
}
