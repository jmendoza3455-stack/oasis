import "server-only";
import { withDb } from "@/lib/db";
import type { BookingStatus } from "@/lib/domain";

export type BookingDetail = {
  id: string;
  status: BookingStatus;
  eventDate: string;
  eventType: "wedding" | "social" | "corporate" | "family_day";
  slot: string;
  overnight: boolean;
  guests: number;
  channel: "planner" | "direct" | "referral" | "organic";
  holdExpiresAt: string | null;
  rentalListNet: number;
  discountPct: number;
  rentalNet: number;
  rentalIgv: number;
  rentalGross: number;
  igvRate: number;
  depositAmount: number;
  guaranteeAmount: number;
  balanceDueOn: string | null;
  contractSignedAt: string | null;
  cancelReason: string | null;
  plannerId: string | null;
  plannerName: string | null;
  client: { name: string | null; phone: string | null; email: string | null; ruc: string | null };
  paidValidated: number;
  guaranteeStatus: string | null;
  commissionStatus: string | null;
  payments: Array<{
    id: string;
    kind: string;
    amount: number;
    method: string;
    status: string;
    paidOn: string;
    operationCode: string | null;
    voucherPath: string | null;
    rejectedReason: string | null;
  }>;
  quotes: Array<{ version: number; status: string; totalGross: number; createdAt: string }>;
  guarantee: { amount: number; status: string; deductions: number } | null;
  commission: { amount: number; status: string; payableOn: string | null } | null;
  history: Array<{
    at: string;
    actorType: string;
    actorEmail: string | null;
    from: string | null;
    to: string | null;
  }>;
};

export async function bookingDetail(userId: string, id: string): Promise<BookingDetail | null> {
  return withDb({ kind: "user", userId }, async (sql) => {
    const [b] = await sql<
      Omit<BookingDetail, "payments" | "history" | "client"> & {
        clientName: string | null;
        clientPhone: string | null;
        clientEmail: string | null;
        clientRuc: string | null;
      }
    >(
      `select b.id, b.status, to_char(b.event_date, 'YYYY-MM-DD') as "eventDate", b.event_type as "eventType",
              b.slot, b.overnight, b.guests, b.channel, to_json(b.hold_expires_at) #>> '{}' as "holdExpiresAt",
              b.rental_list_net::float8 as "rentalListNet", b.discount_pct::float8 as "discountPct",
              b.rental_net::float8 as "rentalNet", b.rental_igv::float8 as "rentalIgv",
              b.rental_gross::float8 as "rentalGross", b.igv_rate::float8 as "igvRate",
              b.deposit_amount::float8 as "depositAmount", b.guarantee_amount::float8 as "guaranteeAmount",
              to_char(b.balance_due_on, 'YYYY-MM-DD') as "balanceDueOn",
              to_json(b.contract_signed_at) #>> '{}' as "contractSignedAt", b.cancel_reason as "cancelReason",
              b.planner_id as "plannerId", p.business_name as "plannerName",
              c.full_name as "clientName", c.phone as "clientPhone", c.email as "clientEmail", c.ruc as "clientRuc",
              public.booking_paid(b.id)::float8 as "paidValidated",
              g.status as "guaranteeStatus", cm.status as "commissionStatus"
         from bookings b
         left join clients c on c.id = b.client_id
         left join planners p on p.id = b.planner_id
         left join guarantees g on g.booking_id = b.id
         left join commissions cm on cm.booking_id = b.id
        where b.id = $1`,
      [id],
    );
    if (!b) return null;
    const payments = await sql<BookingDetail["payments"][number]>(
      `select id, kind, amount::float8 as amount, method, status, to_char(paid_on, 'YYYY-MM-DD') as "paidOn",
              operation_code as "operationCode", voucher_path as "voucherPath", rejected_reason as "rejectedReason"
         from payments where booking_id = $1 order by paid_on, created_at`,
      [id],
    );
    // audit_log es solo admin por RLS: para ops el historial sale vacío
    const history = await sql<BookingDetail["history"][number]>(
      `select to_json(a.at) #>> '{}' as at, a.actor_type as "actorType", pr.email as "actorEmail",
              a.before ->> 'status' as "from", a.after ->> 'status' as "to"
         from audit_log a left join profiles pr on pr.id = a.actor_id
        where a.entity = 'bookings' and a.entity_id = $1
          and (a.action = 'insert' or a.before ->> 'status' is distinct from a.after ->> 'status')
        order by a.at`,
      [id],
    );
    const quotes = await sql<BookingDetail["quotes"][number]>(
      `select version, status, total_gross::float8 as "totalGross", to_json(created_at) #>> '{}' as "createdAt"
         from quotes where booking_id = $1 order by version desc`,
      [id],
    );
    const [guarantee] = await sql<NonNullable<BookingDetail["guarantee"]>>(
      `select amount::float8 as amount, status, deductions::float8 as deductions from guarantees where booking_id = $1`,
      [id],
    );
    const [commission] = await sql<NonNullable<BookingDetail["commission"]>>(
      `select amount::float8 as amount, status, to_char(payable_on, 'YYYY-MM-DD') as "payableOn"
         from commissions where booking_id = $1`,
      [id],
    );
    const { clientName, clientPhone, clientEmail, clientRuc, ...rest } = b;
    return {
      ...rest,
      client: { name: clientName, phone: clientPhone, email: clientEmail, ruc: clientRuc },
      payments,
      history,
      quotes,
      guarantee: guarantee ?? null,
      commission: commission ?? null,
    };
  });
}
