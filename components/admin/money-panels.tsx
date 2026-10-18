"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { formatDate, formatPEN } from "@/lib/domain";
import {
  createQuoteVersion,
  markContractSigned,
  payCommission,
  registerPayment,
  resolveGuarantee,
  reviewPayment,
  type MoneyResult,
} from "@/app/admin/reservas/[id]/money-actions";

const KIND = {
  deposit: "Adelanto",
  balance: "Saldo",
  guarantee: "Garantía",
  other: "Otro",
} as const;
const METHOD = {
  transfer: "Transferencia",
  yape: "Yape",
  plin: "Plin",
  cash: "Efectivo",
  card: "Tarjeta",
} as const;
const STATUS = { pending: "Por validar", validated: "Validado", rejected: "Rechazado" } as const;

type Payment = {
  id: string;
  kind: string;
  amount: number;
  method: string;
  status: string;
  paidOn: string;
  operationCode: string | null;
  voucherUrl: string | null;
  rejectedReason: string | null;
};

export function PaymentsPanel({
  bookingId,
  payments,
  isAdmin,
  today,
}: {
  bookingId: string;
  payments: Payment[];
  isAdmin: boolean;
  today: string;
}) {
  const [state, action, pending] = useActionState<MoneyResult | null, FormData>(
    registerPayment,
    null,
  );
  const form = useRef<HTMLFormElement>(null);
  const [busy, start] = useTransition();
  const [reviewError, setReviewError] = useState<string | null>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  const review = (id: string, approve: boolean) =>
    start(async () => {
      const reason = approve ? undefined : (window.prompt("Motivo del rechazo") ?? "");
      const res = await reviewPayment({ id, approve, reason });
      setReviewError(res.ok ? null : res.error);
    });

  return (
    <div className="grid gap-4">
      {payments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin pagos registrados.</p>
      ) : (
        <ul className="divide-y text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {KIND[p.kind as keyof typeof KIND]} · {formatDate(p.paidOn)} ·{" "}
                {METHOD[p.method as keyof typeof METHOD]}
                {p.operationCode && ` · op. ${p.operationCode}`}
                {p.voucherUrl && (
                  <>
                    {" · "}
                    <a
                      href={p.voucherUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      voucher
                    </a>
                  </>
                )}
                {p.rejectedReason && (
                  <span className="text-destructive block text-xs">{p.rejectedReason}</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <strong>{formatPEN(p.amount)}</strong>
                <span className="text-muted-foreground">
                  ({STATUS[p.status as keyof typeof STATUS]})
                </span>
                {isAdmin && p.status === "pending" && (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => review(p.id, true)}>
                      Validar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => review(p.id, false)}
                    >
                      Rechazar
                    </Button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {reviewError && <p className="text-destructive text-sm">{reviewError}</p>}
      <form
        ref={form}
        action={action}
        className="grid gap-3 rounded-lg border p-3"
        aria-label="Registrar pago"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="grid gap-1">
            <Label htmlFor="p-kind">Concepto</Label>
            <NativeSelect id="p-kind" name="kind" defaultValue="deposit">
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="p-amount">Monto S/</Label>
            <Input id="p-amount" name="amount" type="number" step="0.01" min={0.01} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="p-method">Medio</Label>
            <NativeSelect id="p-method" name="method" defaultValue="transfer">
              {Object.entries(METHOD).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="p-date">Fecha</Label>
            <Input id="p-date" name="paidOn" type="date" defaultValue={today} required />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="p-op">N.º de operación</Label>
            <Input id="p-op" name="operationCode" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="p-voucher">Voucher (JPG, PNG o PDF)</Label>
            <Input
              id="p-voucher"
              name="voucher"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
          </div>
        </div>
        {state && !state.ok && <p className="text-destructive text-sm">{state.error}</p>}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Registrando…" : "Registrar pago"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Queda por validar hasta que el admin lo revise.
        </p>
      </form>
    </div>
  );
}

export function DocumentsPanel({
  bookingId,
  quotes,
  contractSignedAt,
}: {
  bookingId: string;
  quotes: { version: number; status: string; totalGross: number }[];
  contractSignedAt: string | null;
}) {
  const [busy, start] = useTransition();
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => start(async () => void (await createQuoteVersion(bookingId)))}
        >
          Generar cotización
        </Button>
        <a
          href={`/admin/reservas/${bookingId}/contrato`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-md border px-3"
        >
          Contrato PDF
        </a>
        {!contractSignedAt && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => start(async () => void (await markContractSigned(bookingId)))}
          >
            Registrar contrato firmado
          </Button>
        )}
      </div>
      {contractSignedAt && <p className="text-muted-foreground">Contrato firmado registrado.</p>}
      {quotes.length > 0 && (
        <ul className="grid gap-1">
          {quotes.map((q) => (
            <li key={q.version}>
              <a
                href={`/admin/reservas/${bookingId}/cotizacion/${q.version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Cotización v{q.version}
              </a>{" "}
              · {formatPEN(q.totalGross)}{" "}
              {q.status === "superseded" && (
                <span className="text-muted-foreground">(reemplazada)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SettlementPanel({
  bookingId,
  isAdmin,
  guarantee,
  commission,
}: {
  bookingId: string;
  isAdmin: boolean;
  guarantee: { amount: number; status: string; deductions: number } | null;
  commission: { amount: number; status: string; payableOn: string | null } | null;
}) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const G = {
    pending: "Pendiente",
    held: "Retenida",
    returned: "Devuelta",
    applied: "Aplicada",
    partially_applied: "Aplicada en parte",
  } as Record<string, string>;
  const C = { accrued: "Devengada", payable: "Por pagar", paid: "Pagada" } as Record<
    string,
    string
  >;
  return (
    <div className="grid gap-3 text-sm">
      <p>
        Garantía:{" "}
        {guarantee
          ? `${formatPEN(guarantee.amount)} · ${G[guarantee.status]}`
          : "sin pago registrado"}
        {guarantee &&
          guarantee.deductions > 0 &&
          ` · descuentos ${formatPEN(guarantee.deductions)}`}
      </p>
      {isAdmin && guarantee?.status === "held" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const res = await resolveGuarantee({ bookingId, action: "returned" });
              setError(res.ok ? null : res.error);
            })
          }
        >
          Registrar devolución de garantía
        </Button>
      )}
      <p>
        Comisión del planner:{" "}
        {commission
          ? `${formatPEN(commission.amount)} · ${C[commission.status]}${commission.payableOn ? ` desde ${formatDate(commission.payableOn)}` : ""}`
          : "—"}
      </p>
      {isAdmin && commission && commission.status !== "paid" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const reference = window.prompt("N.º de operación del pago al planner") ?? "";
              const res = await payCommission({ bookingId, reference });
              setError(res.ok ? null : res.error);
            })
          }
        >
          Marcar comisión pagada
        </Button>
      )}
      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}
