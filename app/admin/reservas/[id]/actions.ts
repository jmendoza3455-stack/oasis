"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { dbErrorCode, withDb } from "@/lib/db";
import { TRANSITION_ERROR_MESSAGE, type BookingStatus, type TransitionError } from "@/lib/domain";

const schema = z.object({
  id: z.uuid(),
  to: z.enum(["reserved", "confirmed", "done", "settled", "cancelled"]),
  reason: z.string().trim().max(300).optional(),
});

export async function transitionBooking(
  input: z.input<typeof schema>,
): Promise<{ ok: true; status: BookingStatus } | { ok: false; error: string }> {
  const user = await requireStaff();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  try {
    const [row] = await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql<{ status: BookingStatus }>(`select (public.transition_booking($1, $2, $3)).status`, [
        parsed.data.id,
        parsed.data.to,
        parsed.data.reason || null,
      ]),
    );
    refresh();
    return { ok: true, status: row.status };
  } catch (error) {
    const code = dbErrorCode(error) as TransitionError;
    return { ok: false, error: TRANSITION_ERROR_MESSAGE[code] ?? "No se pudo cambiar el estado." };
  }
}
