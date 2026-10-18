"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { SETTINGS } from "@/lib/content/settings-schema";
import { activeVenue } from "@/server/venue";

export type ConfigResult = { ok: true } | { ok: false; error: string };

export async function saveSetting(key: string, raw: string): Promise<ConfigResult> {
  const user = await requireAdmin();
  const def = SETTINGS.find((s) => s.key === key);
  if (!def) return { ok: false, error: "Parámetro desconocido." };
  let value: unknown;
  try {
    if (def.type === "number") value = z.coerce.number().finite().min(0).parse(raw);
    else if (def.type === "percent") value = z.coerce.number().min(0).max(100).parse(raw) / 100;
    else if (def.type === "date")
      value = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(raw);
    else if (def.type === "json") value = JSON.parse(raw);
    else value = z.string().trim().min(1).max(100).parse(raw);
  } catch {
    return { ok: false, error: `Valor inválido para «${def.label}».` };
  }
  if (key === "booking_mode" && !["one_per_day", "slots"].includes(String(value))) {
    return { ok: false, error: "El modo debe ser one_per_day o slots." };
  }
  const venue = await activeVenue();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into settings (venue_id, key, value, updated_by) values ($1, $2, $3, $4)
       on conflict (venue_id, key) do update set value = excluded.value, updated_by = excluded.updated_by`,
      [venue.id, key, JSON.stringify(value), user.id],
    ),
  );
  refresh();
  return { ok: true };
}

const rateSchema = z.object({
  id: z.uuid(),
  priceNet: z.coerce.number().min(0),
  validated: z.boolean(),
});

export async function saveRate(input: z.input<typeof rateSchema>): Promise<ConfigResult> {
  const user = await requireAdmin();
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Precio inválido." };
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(`update rate_cards set price_net = $2, is_placeholder = $3 where id = $1`, [
      parsed.data.id,
      parsed.data.priceNet,
      !parsed.data.validated,
    ]),
  );
  refresh();
  return { ok: true };
}

export async function addHoliday(input: { date: string; name: string }): Promise<ConfigResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      name: z.string().trim().min(3).max(100),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fecha y nombre son obligatorios." };
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into holidays (date, name) values ($1, $2) on conflict (date) do update set name = excluded.name`,
      [parsed.data.date, parsed.data.name],
    ),
  );
  refresh();
  return { ok: true };
}

export async function deleteHoliday(date: string): Promise<ConfigResult> {
  const user = await requireAdmin();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(`delete from holidays where date = $1`, [date]),
  );
  refresh();
  return { ok: true };
}
