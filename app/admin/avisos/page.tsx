import type { Metadata } from "next";
import { Suspense } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { MarkSentButton, RunJobForm } from "@/components/admin/notification-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/content/seo";
import { withDb } from "@/lib/db";
import { icalToken } from "@/lib/feed-token";
import { whatsappLink } from "@/lib/templates";
import { activeVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Avisos" };

const KIND_LABEL: Record<string, string> = {
  balance_due_soon: "Saldo por vencer",
  balance_due_today: "Saldo vence hoy",
  balance_overdue: "Saldo vencido",
  event_d7: "Evento D-7",
  event_d1: "Evento D-1",
  nps_request: "Encuesta NPS",
  ops_daily: "Resumen de operación",
  lead_sla: "Lead sin respuesta",
  weekly_summary: "Resumen semanal",
  agent_handoff: "Derivación del Recepcionista",
};

const STATUS: Record<string, { label: string; color: string }> = {
  queued: { label: "En cola", color: "var(--status-warning)" },
  sent: { label: "Enviado", color: "var(--status-good)" },
  skipped: { label: "No enviado", color: "var(--muted-foreground)" },
  failed: { label: "Error", color: "var(--status-critical)" },
};

const dateTime = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "short",
  timeStyle: "short",
});

type Row = {
  id: string;
  kind: string;
  channel: "email" | "whatsapp";
  recipient: string | null;
  subject: string | null;
  body: string;
  status: string;
  error: string | null;
  templateVersion: string;
  createdAt: Date;
};

async function Outbox() {
  const user = await requireStaff();
  const venue = await activeVenue();
  const rows = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql<Row>(
      `select id, kind, channel, recipient, subject, body, status, error,
              template_version as "templateVersion", created_at as "createdAt"
         from notifications where venue_id = $1
        order by (status = 'queued' and channel = 'whatsapp') desc, created_at desc limit 100`,
      [venue.id],
    ),
  );

  return (
    <div className="grid gap-4">
      {user.role === "admin" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Procesos automáticos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="text-muted-foreground">
                Corren solos: avisos del día a las 08:00, leads sin respuesta cada 15 min y resumen
                a socios los lunes. Solo avisan: no cambian tarifas, pagos ni comisiones.
              </p>
              <RunJobForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Calendario en Google Calendar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p className="text-muted-foreground">
                En Google Calendar: Otros calendarios → Desde URL. No compartas este enlace.
              </p>
              <code
                className="bg-muted rounded p-2 text-xs break-all"
                aria-label="URL del feed iCal"
              >
                {`${SITE_URL}/api/ical/${icalToken(venue.id)}.ics`}
              </code>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bandeja de avisos</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay avisos.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((n) => {
                const wa =
                  n.channel === "whatsapp" && n.status === "queued"
                    ? whatsappLink(n.recipient, n.body)
                    : null;
                return (
                  <li key={n.id} className="grid gap-1 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.channel === "email" ? (
                        <Mail className="size-4" aria-label="Correo" />
                      ) : (
                        <MessageCircle className="size-4" aria-label="WhatsApp" />
                      )}
                      <span className="font-medium">{KIND_LABEL[n.kind] ?? n.kind}</span>
                      <Badge variant="outline" style={{ color: STATUS[n.status]?.color }}>
                        {STATUS[n.status]?.label ?? n.status}
                      </Badge>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {dateTime.format(new Date(n.createdAt))} · v{n.templateVersion}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      Para: {n.recipient ?? "—"}
                      {n.error ? ` · ${n.error}` : ""}
                    </p>
                    <details>
                      <summary className="text-muted-foreground cursor-pointer text-xs">
                        {n.subject ?? "Ver mensaje"}
                      </summary>
                      <p className="bg-muted mt-1 rounded p-2 text-xs whitespace-pre-wrap">
                        {n.body}
                      </p>
                    </details>
                    {wa && (
                      <div className="flex gap-2">
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-brand-green text-brand-sand rounded-md px-3 py-1.5 text-xs font-medium"
                        >
                          Abrir WhatsApp
                        </a>
                        <MarkSentButton id={n.id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AvisosPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Avisos</h1>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Outbox />
      </Suspense>
    </div>
  );
}
