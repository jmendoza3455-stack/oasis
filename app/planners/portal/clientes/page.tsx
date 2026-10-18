import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientForm } from "@/components/portal/client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/domain";
import { activePlannerContext, plannerClients } from "@/server/queries/planner";

export const metadata: Metadata = { title: "Mis clientes" };

async function Clients() {
  const ctx = await activePlannerContext();
  const clients = await plannerClients(ctx);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Registrar cliente</CardTitle>
          <p className="text-muted-foreground text-sm">
            Queda protegido a tu nombre por {ctx.settings.protectionDays} días.
          </p>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tus clientes ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aún no registras clientes.</p>
          ) : (
            <ul className="divide-y text-sm">
              {clients.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    <strong>{c.fullName}</strong>
                    <span className="text-muted-foreground block">
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-right">
                    Registrado {formatDate(c.createdOn)}
                    {c.protectedUntil && (
                      <span className="block">Protegido hasta {formatDate(c.protectedUntil)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Mis clientes</h1>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Clients />
      </Suspense>
    </div>
  );
}
