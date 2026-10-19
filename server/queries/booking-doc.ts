import "server-only";
import { withDb } from "@/lib/db";
import type { DocBooking, DocCompany } from "@/lib/pdf/documents";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";

const SLOT = { full_day: "full day", night: "noche", full_day_and_night: "día y noche" } as const;

export async function bookingForDocument(userId: string, id: string) {
  return withDb({ kind: "user", userId }, async (sql) => {
    const [b] = await sql<{
      code: string;
      eventDate: string;
      eventType: keyof typeof EVENT_TYPE_LABEL;
      slot: keyof typeof SLOT;
      guests: number;
      overnight: boolean;
      name: string | null;
      ruc: string | null;
      email: string | null;
      phone: string | null;
      listNet: number;
      discountPct: number;
      net: number;
      igv: number;
      gross: number;
      igvRate: number;
      deposit: number;
      balanceDueOn: string | null;
      guarantee: number;
      venueId: string;
    }>(
      `select upper(substr(b.id::text, 1, 8)) as code, to_char(b.event_date, 'YYYY-MM-DD') as "eventDate",
              b.event_type as "eventType", b.slot, b.guests, b.overnight, c.full_name as name, c.ruc, c.email, c.phone,
              b.rental_list_net::float8 as "listNet", b.discount_pct::float8 as "discountPct", b.rental_net::float8 as net,
              b.rental_igv::float8 as igv, b.rental_gross::float8 as gross, b.igv_rate::float8 as "igvRate",
              b.deposit_amount::float8 as deposit, to_char(b.balance_due_on, 'YYYY-MM-DD') as "balanceDueOn",
              b.guarantee_amount::float8 as guarantee, b.venue_id as "venueId"
         from bookings b left join clients c on c.id = b.client_id where b.id = $1`,
      [id],
    );
    if (!b) return null;
    const [p] = await sql<{
      value: {
        early_cancel_min_days?: number;
        early_cancel_refund_pct?: number;
        reschedule_free_min_days?: number;
      } | null;
    }>(`select value from settings where venue_id = $1 and key = 'cancellation_policy'`, [
      b.venueId,
    ]);
    const co = Object.fromEntries(
      (
        await sql<{ key: string; value: unknown }>(
          `select key, value from settings where venue_id = $1
              and key in ('company_legal_name', 'company_ruc', 'company_address')`,
          [b.venueId],
        )
      ).map((r) => [r.key, typeof r.value === "string" && r.value.trim() ? r.value : null]),
    ) as Record<string, string | null>;
    const company: DocCompany = {
      legalName: co.company_legal_name ?? "[COMPLETAR razón social]",
      ruc: co.company_ruc ?? "[COMPLETAR]",
      address: co.company_address ?? "[COMPLETAR]",
    };
    const doc: DocBooking = {
      code: b.code,
      eventDate: b.eventDate,
      eventLabel: EVENT_TYPE_LABEL[b.eventType],
      guests: b.guests,
      overnight: b.overnight,
      client: { name: b.name ?? "[COMPLETAR]", document: b.ruc, email: b.email, phone: b.phone },
      listNet: b.listNet,
      discountPct: b.discountPct,
      net: b.net,
      igv: b.igv,
      gross: b.gross,
      igvRate: b.igvRate,
      deposit: b.deposit,
      balanceDueOn: b.balanceDueOn,
      guarantee: b.guarantee,
      slotLabel: SLOT[b.slot],
    };
    const policy = {
      earlyDays: p?.value?.early_cancel_min_days ?? 60,
      earlyPct: p?.value?.early_cancel_refund_pct ?? 0.5,
      reschedDays: p?.value?.reschedule_free_min_days ?? 30,
    };
    return { doc, policy, company };
  });
}
