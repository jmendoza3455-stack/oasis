"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { JOBS, type RunReport } from "@/server/automations";

export type RunResult = { ok: boolean; message: string };

const describe = (r: RunReport) =>
  `${r.queued} avisos nuevos · ${r.sent} enviados · ${r.skipped} sin proveedor o contacto · ${r.failed} con error.`;

/** Ejecuta un job a demanda (mismo código que el cron). Solo admin. */
export async function runJobNow(_: RunResult | null, formData: FormData): Promise<RunResult> {
  await requireAdmin();
  const job = z.enum(["diario", "sla", "semanal"]).safeParse(formData.get("job"));
  if (!job.success) return { ok: false, message: "Proceso desconocido." };
  try {
    const report = await JOBS[job.data]();
    refresh();
    return { ok: true, message: describe(report) };
  } catch (error) {
    console.error("runJobNow", error);
    return { ok: false, message: "No se pudo ejecutar el proceso." };
  }
}

/** Marca como enviado un WhatsApp que el staff mandó a mano con el enlace prellenado. */
export async function markWhatsappSent(id: string): Promise<void> {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success) return;
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update notifications set status = 'sent', sent_at = now(), sent_by = auth.uid()
        where id = $1 and channel = 'whatsapp' and status = 'queued'`,
      [id],
    ),
  );
  refresh();
}
