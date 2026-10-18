import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withDb } from "@/lib/db";

export type Role = "admin" | "ops" | "planner";

export type SessionUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role | null;
  plannerId: string | null;
};

export const DEV_AUTH_COOKIE = "oasis_dev_user";

/**
 * Login de desarrollo (elegir usuario sin contraseña) para local y CI. Nunca en Vercel:
 * VERCEL=1 está definido en todo despliegue, incluso previews.
 */
export function devAuthEnabled(): boolean {
  return process.env.OASIS_DEV_AUTH === "1" && !process.env.VERCEL;
}

async function currentUserId(): Promise<string | null> {
  if (devAuthEnabled()) {
    return (await cookies()).get(DEV_AUTH_COOKIE)?.value ?? null;
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const id = await currentUserId();
  if (!id) return null;
  const rows = await withDb({ kind: "user", userId: id }, (sql) =>
    sql<{
      email: string | null;
      full_name: string | null;
      role: Role | null;
      planner_id: string | null;
    }>(`select email, full_name, role, planner_id from public.profiles where id = $1`, [id]),
  );
  const p = rows[0];
  if (!p) return null;
  return { id, email: p.email, fullName: p.full_name, role: p.role, plannerId: p.planner_id };
}

export async function requireRole(roles: readonly Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");
  if (!user.role || !roles.includes(user.role)) redirect("/ingresar?error=sin_acceso");
  return user;
}

export const requireStaff = () => requireRole(["admin", "ops"]);
export const requireAdmin = () => requireRole(["admin"]);
export const requirePlanner = () => requireRole(["planner"]);

export function homeFor(role: Role | null): string {
  if (role === "admin" || role === "ops") return "/admin/calendario";
  if (role === "planner") return "/planners/portal";
  return "/ingresar?error=sin_acceso";
}
