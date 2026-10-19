"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { dbErrorCode, withDb } from "@/lib/db";
import {
  RESCHEDULE_ERROR_MESSAGE,
  TRANSITION_ERROR_MESSAGE,
  type BookingStatus,
  type TransitionError,
} from "@/lib/domain";

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

export type RescheduleResult = { ok: boolean; message: string } | null;

/** Reprograma una reserva Separada o Confirmada (reglas en reschedule_booking()). */
export async function rescheduleBooking(
  _: RescheduleResult,
  formData: FormData,
): Promise<RescheduleResult> {
  const user = await requireStaff();
  const parsed = z
    .object({
      id: z.uuid(),
      newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la nueva fecha."),
      reason: z.string().trim().min(3, "Indica el motivo.").max(300),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  try {
    await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql(`select public.reschedule_booking($1, $2, $3)`, [
        parsed.data.id,
        parsed.data.newDate,
        parsed.data.reason,
      ]),
    );
  } catch (error) {
    const code = dbErrorCode(error) as keyof typeof RESCHEDULE_ERROR_MESSAGE;
    return { ok: false, message: RESCHEDULE_ERROR_MESSAGE[code] ?? "No se pudo reprogramar." };
  }
  refresh();
  return { ok: true, message: "Reserva reprogramada. Se recalculó el vencimiento del saldo." };
}
