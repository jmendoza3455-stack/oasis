"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { createPrebooking, prebookingSchema } from "@/server/prebooking";

export type CrmResult = { ok: true } | { ok: false; error: string };

const stage = z.enum(["new", "contacted", "visit_scheduled", "quoted", "lost"]);

export async function moveLead(input: {
  id: string;
  stage: string;
  lostReason?: string;
}): Promise<CrmResult> {
  const user = await requireStaff();
  const parsed = z
    .object({ id: z.uuid(), stage, lostReason: z.string().trim().max(300).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Etapa inválida." };
  if (parsed.data.stage === "lost" && !parsed.data.lostReason) {
    return { ok: false, error: "El motivo de pérdida es obligatorio." };
  }
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(`update leads set stage = $2, lost_reason = $3 where id = $1`, [
      parsed.data.id,
      parsed.data.stage,
      parsed.data.stage === "lost" ? parsed.data.lostReason : null,
    ]),
  );
  refresh();
  return { ok: true };
}

const activitySchema = z.object({
  leadId: z.uuid(),
  kind: z.enum(["call", "whatsapp", "email", "visit", "note", "task"]),
  notes: z.string().trim().max(2000).optional(),
  dueAt: z.string().optional(),
});

export async function addActivity(_: unknown, formData: FormData): Promise<CrmResult> {
  const user = await requireStaff();
  const parsed = activitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Revisa la actividad." };
  const due = parsed.data.dueAt ? new Date(`${parsed.data.dueAt}:00-05:00`) : null;
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into activities (lead_id, kind, notes, due_at, actor_id) values ($1, $2, $3, $4, $5)`,
      [parsed.data.leadId, parsed.data.kind, parsed.data.notes || null, due, user.id],
    ),
  );
  refresh();
  return { ok: true };
}

export async function createBookingFromLead(_: unknown, formData: FormData): Promise<CrmResult> {
  const user = await requireStaff();
  const parsed = prebookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const res = await createPrebooking(user, parsed.data);
  if (!res.ok) return res;
  redirect(`/admin/reservas/${res.bookingId}`);
}
