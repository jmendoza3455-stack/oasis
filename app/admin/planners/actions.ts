"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { devAuthEnabled, requireAdmin } from "@/lib/auth/session";
import { withDb } from "@/lib/db";

export type PlannerAdminResult = { ok: true; message?: string } | { ok: false; error: string };

const inviteSchema = z.object({
  businessName: z.string().trim().min(2, "Falta la marca o empresa.").max(120),
  contactName: z.string().trim().min(2, "Falta el nombre de contacto.").max(120),
  email: z.email("Correo inválido."),
  phone: z.string().trim().max(20).optional(),
  applicationId: z.uuid().optional(),
});

/** Alta por invitación (OASIS.md §5.2): crea el planner y su usuario con rol planner. */
export async function invitePlanner(
  input: z.input<typeof inviteSchema>,
): Promise<PlannerAdminResult> {
  const user = await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const email = d.email.toLowerCase();

  const [existing] = await withDb({ kind: "service" }, (sql) =>
    sql<{ id: string }>(`select id from planners where lower(email) = $1`, [email]),
  );
  if (existing) return { ok: false, error: "Ya existe un planner con ese correo." };

  const [planner] = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql<{ id: string }>(
      `insert into planners (business_name, contact_name, email, phone, status, invited_by)
       values ($1, $2, $3, $4, 'active', $5) returning id`,
      [d.businessName, d.contactName, email, d.phone || null, user.id],
    ),
  );

  let message = "Planner creado e invitado por correo.";
  if (devAuthEnabled()) {
    try {
      await withDb({ kind: "service" }, (sql) =>
        sql(`insert into auth.users (email, raw_app_meta_data) values ($1, $2)`, [
          email,
          JSON.stringify({ role: "planner", planner_id: planner.id }),
        ]),
      );
    } catch {
      await withDb({ kind: "service" }, (sql) =>
        sql(`delete from planners where id = $1`, [planner.id]),
      );
      return { ok: false, error: "No se pudo crear el usuario del planner." };
    }
    message = "Planner creado (modo desarrollo: sin correo de invitación).";
  } else {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${site}/auth/callback`,
      data: { full_name: d.contactName },
    });
    if (error || !data.user) {
      await withDb({ kind: "service" }, (sql) =>
        sql(`delete from planners where id = $1`, [planner.id]),
      );
      return {
        ok: false,
        error: "No se pudo enviar la invitación. Revisa el correo e intenta de nuevo.",
      };
    }
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: "planner", planner_id: planner.id },
    });
    await withDb({ kind: "service" }, (sql) =>
      sql(`update profiles set role = 'planner', planner_id = $2, full_name = $3 where id = $1`, [
        data.user!.id,
        planner.id,
        d.contactName,
      ]),
    );
  }
  if (d.applicationId) {
    await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql(`update planner_applications set status = 'invited' where id = $1`, [d.applicationId]),
    );
  }
  refresh();
  return { ok: true, message };
}

export async function setPlannerStatus(
  id: string,
  status: "active" | "suspended",
): Promise<PlannerAdminResult> {
  const user = await requireAdmin();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(`update planners set status = $2 where id = $1`, [z.uuid().parse(id), status]),
  );
  refresh();
  return { ok: true };
}

export async function rejectApplication(id: string): Promise<PlannerAdminResult> {
  const user = await requireAdmin();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(`update planner_applications set status = 'rejected' where id = $1`, [z.uuid().parse(id)]),
  );
  refresh();
  return { ok: true };
}
