import type { Metadata } from "next";
import { Suspense } from "react";
import { PlannerAvailability } from "@/components/portal/availability-calendar";
import { withDb } from "@/lib/db";
import { addDays } from "@/lib/domain";
import { activePlannerContext, plannerBookings, plannerClients } from "@/server/queries/planner";
import { STATUS_COLOR } from "@/lib/ui/status";

export const metadata: Metadata = { title: "Disponibilidad" };

async function Availability() {
  const ctx = await activePlannerContext();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: ctx.venue.timezone }).format(
    new Date(),
  );
  const [days, clients, bookings] = await Promise.all([
    withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
      sql<{ day: string; status: "free" | "prebooked" | "occupied" }>(
        `select to_char(day, 'YYYY-MM-DD') as day, status from public.get_availability($1, $2, $3)`,
        [ctx.venue.id, today, addDays(today, 365)],
      ),
    ),
    plannerClients(ctx),
    plannerBookings(ctx),
  ]);
  const activeHolds = bookings.filter(
    (b) => b.status === "prebooked" && b.holdExpiresAt && new Date(b.holdExpiresAt) > new Date(),
  ).length;
  const canHold = activeHolds < ctx.settings.maxHolds;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Toca un día libre para pre-reservarlo. Pre-reservas activas:{" "}
          <strong className="text-foreground">
            {activeHolds} de {ctx.settings.maxHolds}
          </strong>
          {!canHold && " · llegaste al máximo"}
        </p>
        <ul className="flex gap-4 text-xs" aria-label="Leyenda">
          <li className="flex items-center gap-1.5">
            <span className="bg-card size-3 rounded-sm border" /> Libre
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: STATUS_COLOR.prebooked.bg }} />{" "}
            Pre-reservado
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: STATUS_COLOR.blocked.bg }} />{" "}
            Ocupado
          </li>
        </ul>
      </div>
      <PlannerAvailability
        days={days}
        clients={clients}
        today={today}
        holdHours={ctx.settings.holdHours}
        canHold={canHold}
      />
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Disponibilidad</h1>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <Availability />
      </Suspense>
    </div>
  );
}
