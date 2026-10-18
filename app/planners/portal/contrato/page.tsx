import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AGREEMENT_TITLE, agreementClauses } from "@/lib/content/agreement";
import { plannerContext } from "@/server/queries/planner";
import { acceptAgreement } from "../actions";

export const metadata: Metadata = { title: "Contrato marco" };

async function Agreement() {
  const ctx = await plannerContext();
  if (ctx.accepted) redirect("/planners/portal");
  const clauses = agreementClauses({
    commissionPct: Math.round(ctx.settings.commissionRate * 1000) / 10,
    holdHours: ctx.settings.holdHours,
    maxHolds: ctx.settings.maxHolds,
    protectionDays: ctx.settings.protectionDays,
    paymentDays: ctx.settings.paymentDays,
  });
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">{AGREEMENT_TITLE}</CardTitle>
        <p className="text-muted-foreground text-sm">
          Versión {ctx.settings.agreementVersion}. Bienvenida, {ctx.plannerName}. Para usar el
          portal acepta estas reglas.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          {clauses.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
        <form action={acceptAgreement}>
          <Button type="submit" size="lg" className="w-full">
            Acepto el contrato marco
          </Button>
        </form>
        <p className="text-muted-foreground text-xs">
          Se registra la fecha, la hora y la versión aceptada.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
      <Agreement />
    </Suspense>
  );
}
