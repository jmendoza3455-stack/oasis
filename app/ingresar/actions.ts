"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_AUTH_COOKIE, devAuthEnabled, getSessionUser, homeFor } from "@/lib/auth/session";
import { withDb } from "@/lib/db";

export type LoginState = { error?: string; sent?: boolean };

const emailSchema = z.email({ error: "Ingresa un correo válido." });

export async function devSignIn(formData: FormData) {
  if (!devAuthEnabled()) throw new Error("dev_auth_disabled");
  const userId = z.uuid().parse(formData.get("userId"));
  const rows = await withDb({ kind: "service" }, (sql) =>
    sql<{ role: "admin" | "ops" | "planner" | null }>(`select role from profiles where id = $1`, [
      userId,
    ]),
  );
  (await cookies()).set(DEV_AUTH_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(homeFor(rows[0]?.role ?? null));
}

export async function signInWithPassword(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(8).safeParse(formData.get("password"));
  if (!email.success) return { error: email.error.issues[0].message };
  if (!password.success) return { error: "La contraseña tiene al menos 8 caracteres." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data,
  });
  if (error) return { error: "Correo o contraseña incorrectos." };
  const user = await getSessionUser();
  redirect(homeFor(user?.role ?? null));
}

export async function sendMagicLink(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${site}/auth/callback` },
  });
  // Misma respuesta exista o no la cuenta (no revelar qué correos están registrados)
  if (error && error.status !== 400 && error.status !== 422) {
    return { error: "No pudimos enviar el enlace. Intenta en unos minutos." };
  }
  return { sent: true };
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(DEV_AUTH_COOKIE);
  if (!devAuthEnabled()) {
    const { createClient } = await import("@/lib/supabase/server");
    await (await createClient()).auth.signOut();
  }
  redirect("/ingresar");
}
