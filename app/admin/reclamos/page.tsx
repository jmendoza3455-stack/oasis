import type { Metadata } from "next";
import { Suspense } from "react";
import { ComplaintResponseForm } from "@/components/admin/complaint-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { daysBetween, formatDate, formatPEN } from "@/lib/domain";
import { staffVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Libro de Reclamaciones" };

type Row = {
  id: string;
  code: string;
  kind: string;
  fullName: string;
  email: string;
  phone: string | null;
  serviceDescription: string;
  amount: number | null;
  detail: string;
  request: string;
  response: string | null;
  respondedAt: string | null;
  dueOn: string;
  createdAt: string;
};

async function Complaints() {
  const user = await requireStaff();
  const venue = await staffVenue(user.id);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  const rows = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql<Row>(
      `select id, code, kind, full_name as "fullName", email, phone, service_description as "serviceDescription",
              amount::float8, detail, request, response,
              to_char(responded_at at time zone 'America/Lima', 'YYYY-MM-DD') as "respondedAt",
              to_char(due_on, 'YYYY-MM-DD') as "dueOn",
              to_char(created_at at time zone 'America/Lima', 'YYYY-MM-DD') as "createdAt"
         from complaints where venue_id = $1
        order by (responded_at is null) desc, due_on, created_at desc limit 100`,
      [venue.id],
    ),
  );
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay reclamos ni quejas registrados.</p>;
  }
  return (
    <div className="grid gap-4">
      {rows.map((c) => {
        const left = daysBetween(today, c.dueOn);
        const urgent = !c.respondedAt && left <= 5;
        return (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {c.code} · {c.kind === "reclamo" ? "Reclamo" : "Queja"}
                {c.respondedAt ? (
                  <Badge variant="outline" style={{ color: "var(--status-good)" }}>
                    Respondido el {formatDate(c.respondedAt)}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    style={{ color: urgent ? "var(--status-critical)" : "var(--status-warning)" }}
                  >
                    {left < 0
                      ? `Vencido hace ${-left} días`
                      : `Vence el ${formatDate(c.dueOn)} (${left} días)`}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p className="text-muted-foreground">
                {c.fullName} · {c.email}
                {c.phone ? ` · ${c.phone}` : ""} · registrado el {formatDate(c.createdAt)}
                {c.amount !== null ? ` · monto ${formatPEN(c.amount)}` : ""}
              </p>
              <p>
                <strong>Servicio:</strong> {c.serviceDescription}
              </p>
              <p className="whitespace-pre-wrap">
                <strong>Detalle:</strong> {c.detail}
              </p>
              <p className="whitespace-pre-wrap">
                <strong>Pedido:</strong> {c.request}
              </p>
              {c.response ? (
                <p className="bg-muted rounded p-2 whitespace-pre-wrap">
                  <strong>Respuesta:</strong> {c.response}
                </p>
              ) : (
                <ComplaintResponseForm id={c.id} code={c.code} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function ReclamosPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Libro de Reclamaciones</h1>
      <p className="text-muted-foreground text-sm">
        Responde dentro del plazo (por validar con asesoría legal, S27) y envía la respuesta al
        correo del consumidor. El resumen diario de operación avisa los que vencen en 5 días o
        menos.
      </p>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Complaints />
      </Suspense>
    </div>
  );
}
