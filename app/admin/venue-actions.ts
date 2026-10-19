"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { staffVenues, VENUE_COOKIE } from "@/server/venue";

/** Cambia el local con el que trabaja el back-office (solo entre los que el usuario tiene acceso). */
export async function selectVenue(slug: string): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  const parsed = z
    .string()
    .regex(/^[a-z0-9-]{2,60}$/)
    .safeParse(slug);
  if (!parsed.success) return { ok: false };
  const venues = await staffVenues(user.id);
  if (!venues.some((v) => v.slug === parsed.data)) return { ok: false };
  (await cookies()).set(VENUE_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
  return { ok: true };
}
