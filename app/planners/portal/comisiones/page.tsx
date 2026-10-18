import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { commissionStatus, formatDate, formatPEN } from "@/lib/domain";
import { activePlannerContext, plannerCommissions } from "@/server/queries/planner";

export const metadata: Metadata = { title: "Comisiones" };

const LABEL = { accrued: "Devengada", payable: "Por pagar", paid: "Pagada" } as const;

async function Commissions() {
  const ctx = await activePlannerContext();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  const rows = (await plannerCommissions(ctx)).map((c) => ({
    ...c,
    state: c.payableOn
      ? commissionStatus({ payableOn: c.payableOn, paidAt: c.paidAt }, today)
      : c.status,
  }));
  const total = (s: keyof typeof LABEL) =>
    rows.filter((r) => r.state === s).reduce((a, r) => a + r.amount, 0);
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {(["accrued", "payable", "paid"] as const).map((s) => (
          <Card key={s}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {LABEL[s]}
              </CardTitle>
            </CardHeader>
            <CardContent className="font-display text-3xl">{formatPEN(total(s))}</CardContent>
          </Card>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        {Math.round(ctx.settings.commissionRate * 1000) / 10} % sobre el alquiler sin IGV, pagadera{" "}
        {ctx.settings.paymentDays} días después del evento realizado y cobrado.
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aún no tienes comisiones.</p>
      ) : (
        <ul className="bg-card divide-y rounded-xl border text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 p-4">
              <span>
                {formatDate(r.eventDate)} · {r.clientName ?? "—"}
                <span className="text-muted-foreground block">
                  Base {formatPEN(r.baseNet)} × {Math.round(r.rate * 1000) / 10} %
                </span>
              </span>
              <span className="text-right">
                <strong>{formatPEN(r.amount)}</strong>
                <span className="text-muted-foreground block">
                  {LABEL[r.state as keyof typeof LABEL]}
                  {r.payableOn && r.state !== "paid" && ` · desde ${formatDate(r.payableOn)}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Comisiones</h1>
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Commissions />
      </Suspense>
    </div>
  );
}
