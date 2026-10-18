import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { HBars, MixBar, OccupancyChart, pct, StatTile } from "@/components/dashboard/viz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { requireStaff } from "@/lib/auth/session";
import { conversion, formatPEN, STATUS_LABEL, trafficLight, type EventType } from "@/lib/domain";
import { CHANNEL_LABEL, EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { dashboardData, type DashboardFilters } from "@/server/queries/dashboard";
import { activeVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Dashboard" };

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const monthName = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const days = (sold: number, available: number) => `${sold} de ${available} días`;

function parseFilters(sp: Record<string, string | string[] | undefined>): DashboardFilters {
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" })
    .format(new Date())
    .slice(0, 7);
  const mes =
    typeof sp.mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes) ? sp.mes : current;
  const tipo = typeof sp.tipo === "string" && sp.tipo in EVENT_TYPE_LABEL ? sp.tipo : undefined;
  const canal = typeof sp.canal === "string" && sp.canal in CHANNEL_LABEL ? sp.canal : undefined;
  return {
    month: `${mes}-01`,
    eventType: tipo as EventType | undefined,
    channel: canal as DashboardFilters["channel"],
  };
}

function Filters({ f }: { f: DashboardFilters }) {
  return (
    <form
      method="get"
      aria-label="Filtros del dashboard"
      className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3"
    >
      <div className="grid gap-1">
        <Label htmlFor="f-mes">Mes</Label>
        <Input
          id="f-mes"
          name="mes"
          type="month"
          defaultValue={f.month.slice(0, 7)}
          className="w-40"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-tipo">Segmento</Label>
        <NativeSelect id="f-tipo" name="tipo" defaultValue={f.eventType ?? ""} className="w-44">
          <option value="">Todos</option>
          {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-canal">Canal</Label>
        <NativeSelect id="f-canal" name="canal" defaultValue={f.channel ?? ""} className="w-36">
          <option value="">Todos</option>
          {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit">Aplicar</Button>
    </form>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: PageProps<"/admin/dashboard">["searchParams"];
}) {
  const user = await requireStaff();
  const venue = await activeVenue();
  const f = parseFilters(await searchParams);
  const d = await dashboardData({ kind: "user", userId: user.id }, venue.id, f);
  const filtered = Boolean(f.eventType || f.channel);

  return (
    <div className="grid gap-6">
      <Filters f={f} />
      {filtered && (
        <p className="text-muted-foreground text-xs">
          Con filtros: la ocupación cuenta solo los eventos del segmento o canal elegido.
        </p>
      )}

      <section aria-labelledby="occ-title" className="grid gap-3">
        <h2 id="occ-title" className="font-display text-xl">
          Ocupación · {monthName(f.month)}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Fin de semana y feriados (V-S-D)"
            value={pct(d.occMonth.weekend.rate)}
            sub={`${days(d.occMonth.weekend.sold, d.occMonth.weekend.available)}${d.target.weekend !== null ? ` · meta ${pct(d.target.weekend)}` : ""}`}
            light={
              d.target.weekend !== null
                ? trafficLight(d.occMonth.weekend.rate, d.target.weekend)
                : undefined
            }
          />
          <StatTile
            label="Entre semana (L-J)"
            value={pct(d.occMonth.weekday.rate)}
            sub={`${days(d.occMonth.weekday.sold, d.occMonth.weekday.available)}${d.target.weekday !== null ? ` · meta ${pct(d.target.weekday)}` : ""}`}
            light={
              d.target.weekday !== null
                ? trafficLight(d.occMonth.weekday.rate, d.target.weekday)
                : undefined
            }
          />
          <StatTile
            label="Comprometida a 90 días"
            value={pct(d.occ90.total.rate)}
            sub={`V-S-D ${pct(d.occ90.weekend.rate)} · L-J ${pct(d.occ90.weekday.rate)}`}
          />
          <StatTile
            label={`Año ${f.month.slice(0, 4)}`}
            value={pct(d.occYear.total.rate)}
            sub={`V-S-D ${pct(d.occYear.weekend.rate)} · L-J ${pct(d.occYear.weekday.rate)}`}
          />
        </div>
        {d.target.weekend === null && (
          <p className="text-muted-foreground text-xs">
            Mes anterior a la reapertura: sin meta de ocupación.
          </p>
        )}
        <Card>
          <CardContent className="pt-6">
            <OccupancyChart series={d.series} />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="money-title" className="grid gap-3">
        <h2 id="money-title" className="font-display text-xl">
          Rentabilidad del mes
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Ingreso neto por día disponible"
            value={d.money.nrpad === null ? "—" : formatPEN(d.money.nrpad)}
            sub="Alquiler sin IGV − comisiones − costos directos"
          />
          <StatTile
            label="Ticket promedio (sin IGV)"
            value={d.money.ticket === null ? "—" : formatPEN(d.money.ticket)}
            sub={`${d.money.eventsSold} eventos vendidos`}
          />
          <StatTile
            label="Margen por evento"
            value={d.money.margin === null ? "—" : formatPEN(d.money.margin)}
            sub={`Costos directos ${formatPEN(d.money.directCosts)}`}
          />
          <StatTile
            label="Comisiones por pagar"
            value={formatPEN(d.commissionsPending)}
            sub="Devengadas y pendientes"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Canal directo: CAC vs. {Math.round(d.channel.commissionRate * 100)} % del ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Inversión en pauta</dt>
              <dd className="text-right tabular-nums">{formatPEN(d.channel.spend)}</dd>
              <dt className="text-muted-foreground">Reservas directas cerradas</dt>
              <dd className="text-right tabular-nums">{d.channel.directClosed}</dd>
              <dt className="text-muted-foreground">CAC</dt>
              <dd className="text-right tabular-nums">
                {d.channel.cac === null ? "—" : formatPEN(d.channel.cac)}
              </dd>
              <dt className="text-muted-foreground">Equilibrio (comisión equivalente)</dt>
              <dd className="text-right tabular-nums">
                {d.channel.threshold === null ? "—" : formatPEN(d.channel.threshold)}
              </dd>
              <dt className="text-muted-foreground">ROAS</dt>
              <dd className="text-right tabular-nums">
                {d.channel.roas === null ? "—" : `${d.channel.roas.toFixed(1)}×`}
              </dd>
            </dl>
            {d.channel.adsCostMoreThanCommission === true && (
              <p
                role="alert"
                className="flex items-start gap-2 font-medium"
                style={{ color: "var(--status-critical)" }}
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                La pauta cuesta más que la comisión de un planner: conviene mover inversión a
                planners.
              </p>
            )}
            {d.channel.adsCostMoreThanCommission === false && (
              <p
                className="flex items-start gap-2 font-medium"
                style={{ color: "var(--status-good)" }}
              >
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                La pauta cuesta menos que la comisión de un planner.
              </p>
            )}
            {d.channel.adsCostMoreThanCommission === null && (
              <p className="text-muted-foreground">
                Sin datos suficientes de pauta o cierres en el mes.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mezcla de canales (eventos vendidos del mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <MixBar
              items={d.mix.map((m) => ({
                key: m.channel,
                label: CHANNEL_LABEL[m.channel],
                value: m.events,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embudo por canal (leads del mes)</CardTitle>
          </CardHeader>
          <CardContent>
            {d.funnel.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin leads en el periodo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left">
                      <th className="p-1 font-normal">Canal</th>
                      <th className="p-1 text-right font-normal">Leads</th>
                      <th className="p-1 text-right font-normal">Contactados</th>
                      <th className="p-1 text-right font-normal">Cotizados</th>
                      <th className="p-1 text-right font-normal">Separados</th>
                      <th className="p-1 text-right font-normal">Conversión</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {d.funnel.map((r) => (
                      <tr key={r.channel} className="border-t">
                        <td className="p-1">{CHANNEL_LABEL[r.channel]}</td>
                        <td className="p-1 text-right">{r.leads}</td>
                        <td className="p-1 text-right">{r.contacted}</td>
                        <td className="p-1 text-right">{r.quoted}</td>
                        <td className="p-1 text-right">{r.won}</td>
                        <td className="p-1 text-right">{pct(conversion(r.leads, r.won))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline en S/ (eventos futuros, con IGV)</CardTitle>
          </CardHeader>
          <CardContent>
            <HBars
              format={formatPEN}
              items={d.pipeline.map((p) => ({
                label: STATUS_LABEL[p.status],
                value: p.gross,
                note: `(${p.count})`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top motivos de pérdida</CardTitle>
          </CardHeader>
          <CardContent>
            {d.lost.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Sin leads perdidos con motivo registrado.
              </p>
            ) : (
              <HBars
                format={(v) => String(v)}
                items={d.lost.map((l) => ({ label: l.reason, value: l.n }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NPS</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1">
            <p className="font-display text-4xl leading-none">
              {d.nps.value === null ? "—" : d.nps.value}
            </p>
            <p className="text-muted-foreground text-xs">
              {d.nps.responses} {d.nps.responses === 1 ? "respuesta" : "respuestas"} · promotores
              (9–10) − detractores (0–6)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage(props: PageProps<"/admin/dashboard">) {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Dashboard</h1>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <Dashboard searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
