import "server-only";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import { dbErrorCode, withDb } from "@/lib/db";
import { bestPromotion, PricingError, quote } from "@/lib/domain";
import { loadPricingContext } from "@/server/pricing-context";
import { activeVenue } from "@/server/venue";

// Pre-reserva (hold de 72 h) desde un lead, con precio del tarifario. La usan el CRM y la bandeja
// de agentes (cuando el Recepcionista pide una fecha y una persona la confirma).

export const prebookingSchema = z.object({
  leadId: z.uuid(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
  eventType: z.enum(["wedding", "social", "corporate", "family_day"]),
  guests: z.coerce.number().int().min(1, "Indica los invitados.").max(500),
  discountPct: z.coerce.number().min(0).max(100).default(0),
});
export type PrebookingInput = z.infer<typeof prebookingSchema>;

export const PREBOOKING_ERRORS: Record<string, string> = {
  date_taken: "Esa fecha ya está tomada o bloqueada.",
  discount_over_cap_requires_approval:
    "El descuento supera el tope: solo el admin puede aprobarlo.",
  no_rate_card: "No hay tarifa para ese tipo de evento, fecha y aforo.",
};

export async function createPrebooking(
  user: SessionUser,
  d: PrebookingInput,
): Promise<{ ok: true; bookingId: string } | { ok: false; error: string }> {
  const venue = await activeVenue();
  const ctx = await loadPricingContext(venue.id);
  let priced: ReturnType<typeof quote>;
  try {
    priced = quote(
      ctx.cards,
      {
        eventType: d.eventType,
        date: d.eventDate,
        guests: d.guests,
        discountPct: d.discountPct,
        discountApprovedByAdmin: user.role === "admin",
        promotion: bestPromotion(
          ctx.promotions,
          { eventType: d.eventType, date: d.eventDate },
          ctx.holidays,
        ),
      },
      ctx.holidays,
      ctx.settings,
    );
  } catch (error) {
    if (error instanceof PricingError) {
      const code =
        error.code === "discount_requires_approval"
          ? "discount_over_cap_requires_approval"
          : error.code;
      return { ok: false, error: PREBOOKING_ERRORS[code] ?? "No se pudo calcular el precio." };
    }
    throw error;
  }
  try {
    const [b] = await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql<{ id: string }>(
        `insert into bookings (venue_id, lead_id, client_id, planner_id, channel, event_type, event_date, guests,
                               rental_list_net, discount_pct, discount_approved_by, promotion_id)
         select $1, l.id, l.client_id, l.planner_id, l.channel, $3, $4, $5, $6, $7, $8, $9
           from leads l where l.id = $2
         returning id`,
        [
          venue.id,
          d.leadId,
          d.eventType,
          d.eventDate,
          d.guests,
          priced.list.net,
          priced.discountPct,
          priced.discountPct > ctx.settings.discountCapPct && user.role === "admin"
            ? user.id
            : null,
          priced.promotion?.id ?? null,
        ],
      ),
    );
    if (!b) return { ok: false, error: "El lead no existe." };
    return { ok: true, bookingId: b.id };
  } catch (error) {
    return {
      ok: false,
      error: PREBOOKING_ERRORS[dbErrorCode(error)] ?? "No se pudo crear la pre-reserva.",
    };
  }
}
