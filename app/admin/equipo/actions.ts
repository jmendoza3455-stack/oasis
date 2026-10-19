"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { withDb } from "@/lib/db";

export type TeamResult = { ok: boolean; message: string };

/** Rol de un usuario del equipo. Las planners se gestionan en Planners; nadie se quita su propio admin. */
export async function setMemberRole(
  userId: string,
  role: "admin" | "ops" | "none",
): Promise<TeamResult> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ userId: z.uuid(), role: z.enum(["admin", "ops", "none"]) })
    .safeParse({ userId, role });
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };
  if (parsed.data.userId === admin.id && parsed.data.role !== "admin")
    return { ok: false, message: "No puedes quitarte tu propio acceso de admin." };
  const rows = await withDb({ kind: "user", userId: admin.id }, (sql) =>
    sql<{ id: string }>(
      `update profiles set role = $2::user_role where id = $1 and (role is null or role in ('admin', 'ops')) returning id`,
      [parsed.data.userId, parsed.data.role === "none" ? null : parsed.data.role],
    ),
  );
  if (!rows.length)
    return { ok: false, message: "Ese usuario es planner: se gestiona en Planners." };
  refresh();
  return { ok: true, message: "Rol actualizado." };
}

/** Da o quita acceso a un local (solo aplica al personal de operaciones; el admin ve todos). */
export async function setVenueAccess(
  userId: string,
  venueId: string,
  allowed: boolean,
): Promise<TeamResult> {
  const admin = await requireAdmin();
  const parsed = z.object({ userId: z.uuid(), venueId: z.uuid() }).safeParse({ userId, venueId });
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };
  await withDb({ kind: "user", userId: admin.id }, (sql) =>
    allowed
      ? sql(
          `insert into venue_members (venue_id, user_id, created_by) values ($1, $2, $3) on conflict do nothing`,
          [parsed.data.venueId, parsed.data.userId, admin.id],
        )
      : sql(`delete from venue_members where venue_id = $1 and user_id = $2`, [
          parsed.data.venueId,
          parsed.data.userId,
        ]),
  );
  refresh();
  return { ok: true, message: allowed ? "Acceso dado." : "Acceso quitado." };
}
