import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Bot, CircleCheck, CircleX } from "lucide-react";
import { StatTile } from "@/components/dashboard/viz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { recepcionistaEnabled } from "@/server/agents/recepcionista";
import { activeVenue } from "@/server/venue";
import { decideProposal } from "./actions";

export const metadata: Metadata = { title: "Agentes" };

const usd = new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "short",
  timeStyle: "short",
});
const STATUS: Record<string, { label: string; color: string }> = {
  proposed: { label: "Por decidir", color: "var(--status-warning)" },
  approved: { label: "Aprobada", color: "var(--status-good)" },
  rejected: { label: "Rechazada", color: "var(--muted-foreground)" },
};

async function Agents() {
  const user = await requireStaff();
  const venue = await activeVenue();
  const { proposals, month, budget } = await withDb(
    { kind: "user", userId: user.id },
    async (sql) => ({
      proposals: await sql<{
        id: string;
        agent: string;
        title: string;
        body: string;
        status: string;
        leadId: string | null;
        createdAt: Date;
        decisionNote: string | null;
      }>(
        `select id, agent, title, body, status, lead_id as "leadId", created_at as "createdAt",
              decision_note as "decisionNote"
         from agent_proposals where venue_id = $1
        order by (status = 'proposed') desc, created_at desc limit 50`,
        [venue.id],
      ),
      month: (
        await sql<{ runs: number; spent: number; leads: number; errors: number }>(
          `select count(*)::int as runs, coalesce(sum(cost_usd), 0)::float8 as spent,
                count(distinct lead_id)::int as leads,
                count(*) filter (where status <> 'ok')::int as errors
           from agent_runs where venue_id = $1
            and started_at >= date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima'`,
          [venue.id],
        )
      )[0],
      budget: Number(
        (
          await sql<{ v: string }>(
            `select value #>> '{}' as v from settings where venue_id = $1 and key = 'agent_monthly_budget_usd'`,
            [venue.id],
          )
        )[0]?.v ?? 0,
      ),
    }),
  );
  const enabled = recepcionistaEnabled();

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Recepcionista"
          value={enabled ? "Activo" : "Inactivo"}
          sub={enabled ? "Chat en la web pública" : "Falta configurar la API de IA"}
        />
        <StatTile
          label="Conversaciones del mes"
          value={String(month.runs)}
          sub={`${month.errors} con error o sin presupuesto`}
        />
        <StatTile
          label="Leads del chat"
          value={String(month.leads)}
          sub="Registrados por el Recepcionista"
        />
        <StatTile
          label="Gasto de IA del mes"
          value={usd.format(month.spent)}
          sub={`${budget > 0 ? Math.round((month.spent / budget) * 100) : 0} % del tope de ${usd.format(budget)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Propuestas y derivaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin propuestas de los agentes.</p>
          ) : (
            <ul className="divide-y">
              {proposals.map((p) => (
                <li key={p.id} className="grid gap-2 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Bot className="size-4" aria-hidden />
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="outline" style={{ color: STATUS[p.status]?.color }}>
                      {STATUS[p.status]?.label ?? p.status}
                    </Badge>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {p.agent} · {dateTime.format(new Date(p.createdAt))}
                    </span>
                  </div>
                  <details>
                    <summary className="text-muted-foreground cursor-pointer text-xs">
                      Ver detalle
                    </summary>
                    <p className="bg-muted mt-1 rounded p-2 text-xs whitespace-pre-wrap">
                      {p.body}
                    </p>
                  </details>
                  {p.leadId && (
                    <Link href={`/admin/crm/${p.leadId}`} className="text-xs underline">
                      Abrir lead en el CRM
                    </Link>
                  )}
                  {p.decisionNote && (
                    <p className="text-muted-foreground text-xs">Nota: {p.decisionNote}</p>
                  )}
                  {p.status === "proposed" && user.role === "admin" && (
                    <form
                      action={decideProposal}
                      className="flex flex-wrap gap-2"
                      aria-label={`Decidir: ${p.title}`}
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="note"
                        maxLength={500}
                        placeholder="Nota (opcional)"
                        aria-label="Nota de la decisión"
                        className="border-input bg-card min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm"
                      />
                      <Button type="submit" name="decision" value="approved" size="sm">
                        <CircleCheck aria-hidden /> Aprobar
                      </Button>
                      <Button
                        type="submit"
                        name="decision"
                        value="rejected"
                        size="sm"
                        variant="outline"
                      >
                        <CircleX aria-hidden /> Rechazar
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        Los agentes solo proponen y avisan. Aprobar no cambia tarifas, pagos ni comisiones: eso lo
        aplica el admin en Configuración y Finanzas.
      </p>
    </div>
  );
}

export default function AgentesPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Agentes</h1>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Agents />
      </Suspense>
    </div>
  );
}
