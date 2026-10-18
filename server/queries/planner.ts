import "server-only";
import { redirect } from "next/navigation";
import { requirePlanner, type SessionUser } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import type { BookingStatus } from "@/lib/domain";
import { activeVenue, type Venue } from "@/server/venue";

export type PlannerSettings = {
  agreementVersion: string;
  commissionRate: number;
  holdHours: number;
  maxHolds: number;
  protectionDays: number;
  paymentDays: number;
};

export type PlannerContext = {
  user: SessionUser & { plannerId: string };
  venue: Venue;
  plannerName: string;
  settings: PlannerSettings;
  accepted: boolean;
};

export async function plannerContext(): Promise<PlannerContext> {
  const user = await requirePlanner();
  if (!user.plannerId) redirect("/ingresar?error=sin_acceso");
  const venue = await activeVenue();
  return withDb({ kind: "user", userId: user.id }, async (sql) => {
    const rows = await sql<{ key: string; value: unknown }>(
      `select key, value from settings where venue_id = $1 and key = any($2)`,
      [
        venue.id,
        [
          "planner_agreement_version",
          "planner_commission_rate",
          "hold_hours",
          "planner_max_active_holds",
          "planner_protection_days",
          "commission_payment_days",
        ],
      ],
    );
    const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const settings: PlannerSettings = {
      agreementVersion: String(s.planner_agreement_version ?? "2026-10"),
      commissionRate: Number(s.planner_commission_rate ?? 0.05),
      holdHours: Number(s.hold_hours ?? 72),
      maxHolds: Number(s.planner_max_active_holds ?? 2),
      protectionDays: Number(s.planner_protection_days ?? 90),
      paymentDays: Number(s.commission_payment_days ?? 7),
    };
    const [p] = await sql<{ name: string; accepted: boolean }>(
      `select p.business_name as name,
              exists (select 1 from planner_agreements a where a.planner_id = p.id and a.version = $2) as accepted
         from planners p where p.id = $1`,
      [user.plannerId, settings.agreementVersion],
    );
    return {
      user: { ...user, plannerId: user.plannerId! },
      venue,
      plannerName: p?.name ?? "Planner",
      settings,
      accepted: Boolean(p?.accepted),
    };
  });
}

/** Igual que plannerContext pero exige el contrato marco aceptado. */
export async function activePlannerContext(): Promise<PlannerContext> {
  const ctx = await plannerContext();
  if (!ctx.accepted) redirect("/planners/portal/contrato");
  return ctx;
}

export type PlannerClient = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  createdOn: string;
  protectedUntil: string | null;
};

export async function plannerClients(ctx: PlannerContext) {
  return withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
    sql<PlannerClient>(
      `select c.id, c.full_name as "fullName", c.phone, c.email,
              to_char(c.created_at at time zone 'America/Lima', 'YYYY-MM-DD') as "createdOn",
              (select to_char(max(l.protected_until), 'YYYY-MM-DD') from leads l where l.client_id = c.id) as "protectedUntil"
         from clients c order by c.created_at desc`,
    ),
  );
}

export type PlannerBooking = {
  id: string;
  eventDate: string;
  status: BookingStatus;
  eventType: "wedding" | "social" | "corporate" | "family_day";
  guests: number;
  clientName: string | null;
  holdExpiresAt: string | null;
  rentalNet: number;
};

export async function plannerBookings(ctx: PlannerContext) {
  return withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
    sql<PlannerBooking>(
      `select b.id, to_char(b.event_date, 'YYYY-MM-DD') as "eventDate", b.status, b.event_type as "eventType",
              b.guests, c.full_name as "clientName", to_json(b.hold_expires_at) #>> '{}' as "holdExpiresAt",
              b.rental_net::float8 as "rentalNet"
         from bookings b left join clients c on c.id = b.client_id
        order by b.event_date`,
    ),
  );
}

export type PlannerCommission = {
  id: string;
  eventDate: string;
  clientName: string | null;
  baseNet: number;
  rate: number;
  amount: number;
  status: "accrued" | "payable" | "paid";
  payableOn: string | null;
  paidAt: string | null;
};

export async function plannerCommissions(ctx: PlannerContext) {
  return withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
    sql<PlannerCommission>(
      `select cm.id, to_char(b.event_date, 'YYYY-MM-DD') as "eventDate", c.full_name as "clientName",
              cm.base_net::float8 as "baseNet", cm.rate::float8 as rate, cm.amount::float8 as amount, cm.status,
              to_char(cm.payable_on, 'YYYY-MM-DD') as "payableOn", to_json(cm.paid_at) #>> '{}' as "paidAt"
         from commissions cm
         join bookings b on b.id = cm.booking_id
         left join clients c on c.id = b.client_id
        order by b.event_date desc`,
    ),
  );
}
