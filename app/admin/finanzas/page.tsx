import type { Metadata } from "next";
import { Suspense } from "react";
import {
  CampaignForm,
  CapexForm,
  FixedCostForm,
  HistoricalImportForm,
  SpendCsvForm,
  SpendForm,
} from "@/components/admin/finance-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { formatDate, formatPEN } from "@/lib/domain";
import { staffVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Finanzas" };

const COMMISSION = { accrued: "Devengada", payable: "Por pagar", paid: "Pagada" } as Record<
  string,
  string
>;
const FIXED = {
  caretaker: "Guardianía",
  gardening: "Jardinería",
  pool: "Piscina",
  utilities: "Servicios",
  insurance: "Seguros",
  internet: "Internet",
  other: "Otros",
} as Record<string, string>;
const PLATFORM = {
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
  directory: "Directorio",
  other: "Otro",
} as Record<string, string>;

async function Finance() {
  const user = await requireStaff();
  const venue = await staffVenue(user.id);
  const isAdmin = user.role === "admin";
  const d = await withDb({ kind: "user", userId: user.id }, async (sql) => ({
    commissions: await sql<{
      plannerId: string;
      planner: string;
      status: string;
      total: number;
      n: number;
    }>(
      `select cm.planner_id as "plannerId", pl.business_name as planner, cm.status, sum(cm.amount)::float8 as total, count(*)::int as n
         from commissions cm join planners pl on pl.id = cm.planner_id group by 1, 2, 3 order by 2, 3`,
    ),
    campaigns: await sql<{
      id: string;
      name: string;
      platform: string;
      code: string;
      spend: number;
      leads: number;
      won: number;
    }>(
      `select c.id, c.name, c.platform, c.utm_campaign as code,
              coalesce((select sum(amount)::float8 from campaign_spend s where s.campaign_id = c.id), 0) as spend,
              (select count(*)::int from leads l where l.utm_campaign = c.utm_campaign) as leads,
              (select count(*)::int from leads l where l.utm_campaign = c.utm_campaign and l.stage in ('reserved','contracted','done','settled')) as won
         from campaigns c where c.venue_id = $1 order by c.created_at`,
      [venue.id],
    ),
    fixed: await sql<{ month: string; category: string; amount: number }>(
      `select to_char(month, 'YYYY-MM-DD') as month, category, amount::float8 as amount from fixed_costs
        where venue_id = $1 and month >= date_trunc('year', current_date) - interval '1 year' order by month desc, category`,
      [venue.id],
    ),
    capex: await sql<{ description: string; amount: number; spentOn: string }>(
      `select description, amount::float8 as amount, to_char(spent_on, 'YYYY-MM-DD') as "spentOn" from capex_items where venue_id = $1 order by spent_on desc`,
      [venue.id],
    ),
  }));
  const capexTotal = d.capex.reduce((a, c) => a + c.amount, 0);
  const planners = [...new Map(d.commissions.map((c) => [c.plannerId, c.planner])).entries()];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Comisiones por planner</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {planners.length === 0 ? (
            <p className="text-muted-foreground">Sin comisiones aún.</p>
          ) : (
            <table className="w-full">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="p-2">Planner</th>
                  <th className="p-2 text-right">Devengada</th>
                  <th className="p-2 text-right">Por pagar</th>
                  <th className="p-2 text-right">Pagada</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {planners.map(([id, name]) => {
                  const sum = (s: string) =>
                    d.commissions
                      .filter((c) => c.plannerId === id && c.status === s)
                      .reduce((a, c) => a + c.total, 0);
                  return (
                    <tr key={id} className="border-t">
                      <td className="p-2">{name}</td>
                      {["accrued", "payable", "paid"].map((s) => (
                        <td key={s} className="p-2 text-right">
                          {formatPEN(sum(s))}
                        </td>
                      ))}
                      <td className="p-2 text-right">
                        <a
                          href={`/admin/exportar/comisiones?planner=${id}&format=xlsx`}
                          className="underline"
                        >
                          Exportar
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="text-muted-foreground text-xs">
            Estados: {Object.values(COMMISSION).join(" → ")}. El pago se marca desde la ficha de
            cada reserva.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campañas e inversión</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <table className="w-full">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-2">Campaña</th>
                <th className="p-2">utm_campaign</th>
                <th className="p-2 text-right">Inversión</th>
                <th className="p-2 text-right">Leads</th>
                <th className="p-2 text-right">Ganados</th>
                <th className="p-2 text-right">CAC</th>
              </tr>
            </thead>
            <tbody>
              {d.campaigns.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">
                    {c.name}{" "}
                    <span className="text-muted-foreground text-xs">· {PLATFORM[c.platform]}</span>
                  </td>
                  <td className="p-2 font-mono text-xs">{c.code}</td>
                  <td className="p-2 text-right">{formatPEN(c.spend)}</td>
                  <td className="p-2 text-right">{c.leads}</td>
                  <td className="p-2 text-right">{c.won}</td>
                  <td className="p-2 text-right">{c.won ? formatPEN(c.spend / c.won) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <CampaignForm />
          {d.campaigns.length > 0 && (
            <SpendForm campaigns={d.campaigns.map((c) => ({ id: c.id, name: c.name }))} />
          )}
          <SpendCsvForm />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Costos fijos mensuales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {d.fixed.length === 0 ? (
              <p className="text-muted-foreground">Sin costos registrados.</p>
            ) : (
              <ul className="divide-y">
                {d.fixed.map((f) => (
                  <li key={`${f.month}-${f.category}`} className="flex justify-between py-1">
                    <span>
                      {formatDate(f.month).slice(3)} · {FIXED[f.category]}
                    </span>
                    <span>{formatPEN(f.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && <FixedCostForm />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CAPEX de la remodelación · {formatPEN(capexTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {d.capex.length === 0 ? (
              <p className="text-muted-foreground">Sin inversiones registradas.</p>
            ) : (
              <ul className="divide-y">
                {d.capex.map((c) => (
                  <li key={`${c.spentOn}-${c.description}`} className="flex justify-between py-1">
                    <span>
                      {formatDate(c.spentOn)} · {c.description}
                    </span>
                    <span>{formatPEN(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && <CapexForm />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Importar eventos históricos</CardTitle>
            <p className="text-muted-foreground text-sm">
              Bodas y full days ya realizados, para tener historia desde el día 1.{" "}
              <a href="/admin/importar/plantilla" className="underline">
                Descargar plantilla CSV
              </a>
            </p>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <HistoricalImportForm />
            ) : (
              <p className="text-muted-foreground text-sm">Solo el admin importa.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exportar</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {[
              ["reservas", "Reservas"],
              ["leads", "Leads"],
              ["pagos", "Pagos"],
              ["comisiones", "Comisiones"],
            ].map(([k, label]) => (
              <p key={k} className="flex justify-between border-b py-1">
                <span>{label}</span>
                <span className="flex gap-3">
                  <a href={`/admin/exportar/${k}`} className="underline">
                    CSV
                  </a>
                  <a href={`/admin/exportar/${k}?format=xlsx`} className="underline">
                    Excel
                  </a>
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FinancePage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Finanzas</h1>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <Finance />
      </Suspense>
    </div>
  );
}
