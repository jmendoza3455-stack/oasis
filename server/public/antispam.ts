import { serverSecret } from "@/lib/secrets";
import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { withDb } from "@/lib/db";

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "local";
  return createHash("sha256")
    .update(`${ip}:${serverSecret("RATE_LIMIT_SALT", "oasis")}`)
    .digest("hex")
    .slice(0, 32);
}

/** true si la petición está dentro del límite (ventana fija en la BD). */
export async function withinRateLimit(scope: string, max: number, windowSeconds = 600) {
  const key = `${scope}:${await clientIpHash()}`;
  const [row] = await withDb({ kind: "service" }, (sql) =>
    sql<{ ok: boolean }>(`select public.hit_rate_limit($1, $2, $3) as ok`, [
      key,
      windowSeconds,
      max,
    ]),
  );
  return row.ok;
}

/** Cloudflare Turnstile. Sin TURNSTILE_SECRET_KEY configurada (local/CI) se omite. */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
