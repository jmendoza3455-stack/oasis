"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { createPrebooking, prebookingSchema } from "@/server/prebooking";

/**
 * El admin aprueba o rechaza una propuesta de un agente. Aprobar NO ejecuta cambios de dinero:
 * promos, tarifas o presupuestos se aplican a mano en Configuración/Finanzas (CLAUDE.md regla 6).
 */
export async function decideProposal(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().trim().max(500).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update agent_proposals set status = $2, decision_note = $3, decided_by = auth.uid(), decided_at = now()
        where id = $1 and status = 'proposed'`,
      [parsed.data.id, parsed.data.decision, parsed.data.note || null],
    ),
  );
  refresh();
}

export type HoldResult = { ok: false; error: string } | null;

/** Confirma la pre-reserva pedida por el Recepcionista (admin u operaciones). */
export async function confirmHoldProposal(_: HoldResult, formData: FormData): Promise<HoldResult> {
  const user = await requireStaff();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Propuesta inválida." };
  const [p] = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql<{ leadId: string | null; payload: Record<string, unknown> | null }>(
      `select lead_id as "leadId", payload from agent_proposals where id = $1 and kind = 'hold' and status = 'proposed'`,
      [id.data],
    ),
  );
  if (!p?.leadId || !p.payload) return { ok: false, error: "La propuesta ya fue atendida." };
  const input = prebookingSchema.safeParse({ ...p.payload, leadId: p.leadId, discountPct: 0 });
  if (!input.success) return { ok: false, error: "Datos de la propuesta incompletos." };
  const res = await createPrebooking(user, input.data);
  if (!res.ok) return res;
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update agent_proposals set status = 'approved', decided_by = auth.uid(), decided_at = now(),
              decision_note = 'Pre-reserva creada', booking_id = $2
        where id = $1`,
      [id.data, res.bookingId],
    ),
  );
  redirect(`/admin/reservas/${res.bookingId}`);
}
