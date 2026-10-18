"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { dbErrorCode, withDb } from "@/lib/db";
import { PricingError, quote } from "@/lib/domain";
import { loadPricingContext } from "@/server/pricing-context";
import { activeVenue } from "@/server/venue";

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

const bookingSchema = z.object({
  leadId: z.uuid(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
  eventType: z.enum(["wedding", "social", "corporate", "family_day"]),
  guests: z.coerce.number().int().min(1, "Indica los invitados.").max(500),
  discountPct: z.coerce.number().min(0).max(100).default(0),
});

const BOOKING_ERRORS: Record<string, string> = {
  date_taken: "Esa fecha ya está tomada o bloqueada.",
  discount_over_cap_requires_approval:
    "El descuento supera el tope: solo el admin puede aprobarlo.",
  no_rate_card: "No hay tarifa para ese tipo de evento, fecha y aforo.",
};

export async function createBookingFromLead(_: unknown, formData: FormData): Promise<CrmResult> {
  const user = await requireStaff();
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const venue = await activeVenue();
  const ctx = await loadPricingContext(venue.id);
  let listNet: number;
  try {
    listNet = quote(
      ctx.cards,
      {
        eventType: d.eventType,
        date: d.eventDate,
        guests: d.guests,
        discountPct: d.discountPct,
        discountApprovedByAdmin: user.role === "admin",
      },
      ctx.holidays,
      ctx.settings,
    ).list.net;
  } catch (error) {
    if (error instanceof PricingError) {
      return {
        ok: false,
        error:
          BOOKING_ERRORS[
            error.code === "discount_requires_approval"
              ? "discount_over_cap_requires_approval"
              : error.code
          ],
      };
    }
    throw error;
  }
  let bookingId: string;
  try {
    const [b] = await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql<{ id: string }>(
        `insert into bookings (venue_id, lead_id, client_id, planner_id, channel, event_type, event_date, guests,
                               rental_list_net, discount_pct, discount_approved_by)
         select $1, l.id, l.client_id, l.planner_id, l.channel, $3, $4, $5, $6, $7, $8
           from leads l where l.id = $2
         returning id`,
        [
          venue.id,
          d.leadId,
          d.eventType,
          d.eventDate,
          d.guests,
          listNet,
          d.discountPct,
          d.discountPct > ctx.settings.discountCapPct && user.role === "admin" ? user.id : null,
        ],
      ),
    );
    bookingId = b.id;
  } catch (error) {
    return {
      ok: false,
      error: BOOKING_ERRORS[dbErrorCode(error)] ?? "No se pudo crear la pre-reserva.",
    };
  }
  redirect(`/admin/reservas/${bookingId}`);
}
