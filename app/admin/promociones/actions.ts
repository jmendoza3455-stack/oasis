"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { dbErrorCode, withDb } from "@/lib/db";
import { activeVenue } from "@/server/venue";

export type PromoResult = { ok: boolean; message: string };

const EVENT_TYPES = ["wedding", "social", "corporate", "family_day"] as const;
const DAY_TYPES = ["mon_thu", "fri", "sat", "sun_holiday"] as const;

/** Solo el admin crea promociones (CLAUDE.md regla 6); la BD exige que queden dentro del tope. */
export async function createPromotion(
  _: PromoResult | null,
  formData: FormData,
): Promise<PromoResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(3, "Escribe un nombre.").max(80),
      startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica el inicio."),
      endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica el fin."),
      discountPct: z.coerce.number().positive("El descuento debe ser mayor a 0.").max(100),
      eventTypes: z.array(z.enum(EVENT_TYPES)),
      dayTypes: z.array(z.enum(DAY_TYPES)),
    })
    .refine((d) => d.endsOn >= d.startsOn, "El fin debe ser posterior al inicio.")
    .safeParse({
      ...Object.fromEntries(formData),
      eventTypes: formData.getAll("eventTypes"),
      dayTypes: formData.getAll("dayTypes"),
    });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  const venue = await activeVenue();
  try {
    await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql(
        `insert into promotions (venue_id, name, event_types, day_types, starts_on, ends_on, discount_pct)
         values ($1, $2, $3::public.event_type[], $4, $5, $6, $7)`,
        [
          venue.id,
          d.name,
          d.eventTypes.length ? d.eventTypes : null,
          d.dayTypes.length ? d.dayTypes : null,
          d.startsOn,
          d.endsOn,
          d.discountPct,
        ],
      ),
    );
  } catch (error) {
    return {
      ok: false,
      message:
        dbErrorCode(error) === "promotion_over_cap"
          ? "El descuento supera el tope de Configuración (discount_cap_pct)."
          : "No se pudo crear la promoción.",
    };
  }
  refresh();
  return {
    ok: true,
    message: "Promoción creada. Ya se aplica en el cotizador, el chat y las pre-reservas.",
  };
}

export async function deactivatePromotion(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(`update promotions set is_active = false where id = $1`, [id.data]),
  );
  refresh();
}
