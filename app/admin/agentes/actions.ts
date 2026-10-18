"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { withDb } from "@/lib/db";

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
