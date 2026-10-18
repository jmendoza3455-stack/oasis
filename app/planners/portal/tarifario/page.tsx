import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintButton } from "@/components/portal/print-button";
import { withDb } from "@/lib/db";
import { fromNet, formatPEN, round2, type EventType } from "@/lib/domain";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { activePlannerContext } from "@/server/queries/planner";

export const metadata: Metadata = { title: "Tarifario de planner" };

const DAY = {
  mon_thu: "Lun–Jue",
  fri: "Viernes",
  sat: "Sábado",
  sun_holiday: "Dom / feriado",
} as const;

async function RateTable() {
  const ctx = await activePlannerContext();
  const rows = await withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
    sql<{
      eventType: EventType;
      dayType: keyof typeof DAY;
      season: "high" | "low";
      guestsMax: number;
      priceNet: number;
      placeholder: boolean;
    }>(
      `select event_type as "eventType", day_type as "dayType", season, guests_max as "guestsMax",
              price_net::float8 as "priceNet", is_placeholder as placeholder
         from rate_cards where venue_id = $1 and (valid_to is null or valid_to >= current_date)
        order by event_type, season desc, array_position(array['mon_thu','fri','sat','sun_holiday'], day_type)`,
      [ctx.venue.id],
    ),
  );
  const [igv] = await withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
    sql<{ rate: number }>(
      `select (value #>> '{}')::float8 as rate from settings where venue_id = $1 and key = 'igv_rate'`,
      [ctx.venue.id],
    ),
  );
  const groups = Object.groupBy(rows, (r) => r.eventType);
  return (
    <div className="grid gap-6">
      {rows.some((r) => r.placeholder) && (
        <p className="rounded-md border border-dashed p-3 text-sm">
          Tarifas referenciales en validación: pueden cambiar antes de la reapertura.
        </p>
      )}
      {(Object.keys(groups) as EventType[]).map((type) => (
        <section key={type} className="break-inside-avoid">
          <h2 className="font-display mb-2 text-2xl">
            {EVENT_TYPE_LABEL[type]}{" "}
            <span className="text-muted-foreground text-base">
              (hasta {groups[type]![0].guestsMax} invitados)
            </span>
          </h2>
          <div className="bg-card overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="p-2">Temporada</th>
                  <th className="p-2">Día</th>
                  <th className="p-2 text-right">Sin IGV</th>
                  <th className="p-2 text-right">Con IGV</th>
                  <th className="p-2 text-right">Tu comisión</th>
                </tr>
              </thead>
              <tbody>
                {groups[type]!.map((r) => (
                  <tr key={`${r.season}-${r.dayType}`} className="border-t">
                    <td className="p-2">{r.season === "high" ? "Alta (dic–mar)" : "Baja"}</td>
                    <td className="p-2">{DAY[r.dayType]}</td>
                    <td className="p-2 text-right">{formatPEN(r.priceNet)}</td>
                    <td className="p-2 text-right">
                      {formatPEN(fromNet(r.priceNet, igv?.rate ?? 0.18).gross)}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {formatPEN(round2(r.priceNet * ctx.settings.commissionRate))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Tarifario de planner</h1>
        <PrintButton />
      </div>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <RateTable />
      </Suspense>
    </div>
  );
}
