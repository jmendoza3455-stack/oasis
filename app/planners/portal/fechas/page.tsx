import type { Metadata } from "next";
import { Suspense } from "react";
import { ShareDates } from "@/components/portal/share-dates";
import { withDb } from "@/lib/db";
import { addDays, formatDate, isWeekendOrHoliday } from "@/lib/domain";
import { activePlannerContext } from "@/server/queries/planner";
import { activeVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Fechas libres" };

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
const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

async function FreeDates() {
  const ctx = await activePlannerContext();
  const venue = await activeVenue();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  const { dates, holidays } = await withDb({ kind: "user", userId: ctx.user.id }, async (sql) => ({
    dates: (
      await sql<{ d: string }>(
        `select to_char(d, 'YYYY-MM-DD') as d from public.free_dates($1, $2::date, $3::date) d`,
        [venue.slug, today, addDays(today, 90)],
      )
    ).map((r) => r.d),
    holidays: new Set(
      (
        await sql<{ d: string }>(
          `select to_char(date, 'YYYY-MM-DD') as d from holidays where type = 'feriado'`,
        )
      ).map((r) => r.d),
    ),
  }));
  const weekend = dates.filter((d) => isWeekendOrHoliday(d, holidays));
  const byMonth = new Map<string, string[]>();
  for (const d of dates) {
    const k = d.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), d]);
  }
  const label = (d: string) => `${DOW[new Date(`${d}T12:00:00Z`).getUTCDay()]} ${formatDate(d)}`;
  const shareText = [
    `Fechas libres en ${venue.name} (próximos 90 días, viernes a domingo y feriados):`,
    ...weekend.slice(0, 20).map((d) => `• ${label(d)}`),
    "Sujeto a disponibilidad al momento de separar. Consúltame para cotizar.",
  ].join("\n");

  return (
    <div className="grid gap-6">
      <ShareDates text={shareText} count={weekend.length} />
      {[...byMonth.entries()].map(([month, days]) => (
        <section
          key={month}
          className="grid gap-2"
          aria-label={`Fechas libres de ${MONTHS[Number(month.slice(5)) - 1]}`}
        >
          <h2 className="font-medium capitalize">
            {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)} · {days.length} días libres
          </h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {days.map((d) => (
              <li
                key={d}
                className={
                  isWeekendOrHoliday(d, holidays)
                    ? "bg-brand-olive rounded-md px-2 py-1 font-medium text-white"
                    : "bg-card rounded-md border px-2 py-1"
                }
              >
                {label(d)}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-muted-foreground text-xs">
        Resaltadas: viernes a domingo y feriados. La disponibilidad cambia en tiempo real.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Fechas libres</h1>
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <FreeDates />
      </Suspense>
    </div>
  );
}
