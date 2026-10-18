"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { ALLOWED_TYPES, putFile, validateUpload } from "@/lib/storage";
import { activeVenue } from "@/server/venue";

export type MoneyResult = { ok: true } | { ok: false; error: string };

const paymentSchema = z.object({
  bookingId: z.uuid(),
  kind: z.enum(["deposit", "balance", "guarantee", "other"]),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0."),
  method: z.enum(["transfer", "yape", "plin", "cash", "card"]),
  operationCode: z.string().trim().max(60).optional(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha de pago."),
});

export async function registerPayment(
  _: MoneyResult | null,
  formData: FormData,
): Promise<MoneyResult> {
  const user = await requireStaff();
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const voucher = formData.get("voucher");
  let voucherKey: string | null = null;
  if (voucher instanceof File && voucher.size > 0) {
    const invalid = validateUpload(voucher);
    if (invalid) return { ok: false, error: invalid };
    voucherKey = await putFile(
      `vouchers/${d.bookingId}/${randomUUID()}.${ALLOWED_TYPES[voucher.type]}`,
      voucher,
    );
  }
  const venue = await activeVenue();
  await withDb({ kind: "user", userId: user.id }, async (sql) => {
    await sql(
      `insert into payments (booking_id, kind, amount, method, operation_code, paid_on, voucher_path)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [d.bookingId, d.kind, d.amount, d.method, d.operationCode || null, d.paidOn, voucherKey],
    );
    if (voucherKey) {
      await sql(
        `insert into documents (venue_id, booking_id, kind, storage_path) values ($1, $2, 'voucher', $3)`,
        [venue.id, d.bookingId, voucherKey],
      );
    }
  });
  refresh();
  return { ok: true };
}

export async function reviewPayment(input: {
  id: string;
  approve: boolean;
  reason?: string;
}): Promise<MoneyResult> {
  const user = await requireAdmin();
  const id = z.uuid().parse(input.id);
  if (!input.approve && !input.reason?.trim())
    return { ok: false, error: "Indica el motivo del rechazo." };
  const rows = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update payments set status = $2, rejected_reason = $3 where id = $1 and status = 'pending' returning id`,
      [id, input.approve ? "validated" : "rejected", input.approve ? null : input.reason],
    ),
  );
  if (rows.length === 0) return { ok: false, error: "El pago ya fue revisado." };
  refresh();
  return { ok: true };
}

export async function markContractSigned(bookingId: string): Promise<MoneyResult> {
  const user = await requireStaff();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update bookings set contract_signed_at = coalesce(contract_signed_at, now()) where id = $1`,
      [z.uuid().parse(bookingId)],
    ),
  );
  refresh();
  return { ok: true };
}

export async function resolveGuarantee(input: {
  bookingId: string;
  action: "returned" | "applied" | "partially_applied";
  deductions?: number;
  notes?: string;
}): Promise<MoneyResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      bookingId: z.uuid(),
      action: z.enum(["returned", "applied", "partially_applied"]),
      deductions: z.number().min(0).default(0),
      notes: z.string().max(500).optional(),
    })
    .parse(input);
  const rows = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update guarantees set status = $2, deductions = $3, notes = $4, resolved_at = now()
        where booking_id = $1 and status in ('held', 'pending') returning id`,
      [
        parsed.bookingId,
        parsed.action,
        parsed.action === "returned" ? 0 : parsed.deductions,
        parsed.notes ?? null,
      ],
    ),
  );
  if (rows.length === 0) return { ok: false, error: "No hay garantía retenida para esta reserva." };
  refresh();
  return { ok: true };
}

export async function payCommission(input: {
  bookingId: string;
  reference: string;
}): Promise<MoneyResult> {
  const user = await requireAdmin();
  const rows = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update commissions set status = 'paid', payment_reference = $2 where booking_id = $1 and status <> 'paid' returning id`,
      [z.uuid().parse(input.bookingId), input.reference.trim() || null],
    ),
  );
  if (rows.length === 0) return { ok: false, error: "No hay comisión pendiente." };
  refresh();
  return { ok: true };
}

export async function createQuoteVersion(bookingId: string): Promise<MoneyResult> {
  const user = await requireStaff();
  const id = z.uuid().parse(bookingId);
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into quotes (venue_id, lead_id, booking_id, version, lines, subtotal_net, discount_pct, igv_rate,
                           total_net, total_igv, total_gross, valid_until, status, created_by)
       select b.venue_id, b.lead_id, b.id,
              coalesce((select max(version) from quotes q where q.booking_id = b.id), 0) + 1,
              jsonb_build_array(jsonb_build_object('concept', 'Alquiler exclusivo del local', 'net', b.rental_list_net)),
              b.rental_list_net, b.discount_pct, b.igv_rate, b.rental_net, b.rental_igv, b.rental_gross,
              (now() at time zone 'America/Lima')::date + 7, 'sent', $2
         from bookings b where b.id = $1`,
      [id, user.id],
    ),
  );
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update quotes set status = 'superseded'
        where booking_id = $1 and status = 'sent'
          and version < (select max(version) from quotes where booking_id = $1)`,
      [id],
    ),
  );
  refresh();
  return { ok: true };
}
