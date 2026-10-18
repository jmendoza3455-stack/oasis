import type { BookingStatus } from "./booking";
import { daysBetween, type ISODate } from "./calendar";
import { firstResponseSla, type BusinessHours } from "./sla";

// Avisos automáticos (OASIS.md §6.5). Lógica pura: decide QUÉ aviso toca y con qué clave de
// idempotencia; el envío y el registro en el outbox viven en server/automations.

export type ReminderKind =
  "balance_due_soon" | "balance_due_today" | "balance_overdue" | "event_d7" | "event_d1";

export type ReminderBooking = {
  id: string;
  status: BookingStatus;
  eventDate: ISODate;
  balanceDueOn: ISODate | null;
  rentalGross: number;
  paidValidated: number;
};

export type Reminder = { kind: ReminderKind; bookingId: string; dedupeKey: string };

const ACTIVE: readonly BookingStatus[] = ["reserved", "confirmed"];

export function balanceOf(b: Pick<ReminderBooking, "rentalGross" | "paidValidated">): number {
  return Math.max(0, Math.round((b.rentalGross - b.paidValidated) * 100) / 100);
}

/**
 * Avisos que tocan hoy. Ventanas en lugar de días exactos para que un cron que no corrió un día
 * no pierda el aviso; la clave de idempotencia garantiza un solo envío por aviso.
 */
export function dueReminders(
  bookings: readonly ReminderBooking[],
  today: ISODate,
  opts: { balanceNoticeDays: number },
): Reminder[] {
  const out: Reminder[] = [];
  const push = (kind: ReminderKind, id: string) =>
    out.push({ kind, bookingId: id, dedupeKey: `${kind}:${id}` });

  for (const b of bookings) {
    if (!ACTIVE.includes(b.status)) continue;
    const toEvent = daysBetween(today, b.eventDate);
    if (toEvent < 0) continue;

    if (b.balanceDueOn && balanceOf(b) > 0) {
      const toDue = daysBetween(today, b.balanceDueOn);
      if (toDue < 0) push("balance_overdue", b.id);
      else if (toDue === 0) push("balance_due_today", b.id);
      else if (toDue <= opts.balanceNoticeDays) push("balance_due_soon", b.id);
    }

    if (toEvent <= 1) push("event_d1", b.id);
    else if (toEvent <= 7) push("event_d7", b.id);
  }
  return out;
}

export type SlaLead = { id: string; stage: string; createdAt: Date; firstResponseAt: Date | null };

/** Leads nuevos sin primera respuesta que ya pasaron el SLA en minutos hábiles. */
export function slaBreaches(
  leads: readonly SlaLead[],
  now: Date,
  hours: BusinessHours,
  slaMinutes: number,
): { leadId: string; minutes: number; dedupeKey: string }[] {
  return leads
    .filter((l) => l.stage === "new" && l.firstResponseAt === null)
    .map((l) => ({ l, sla: firstResponseSla(l.createdAt, null, now, hours, slaMinutes) }))
    .filter(({ sla }) => sla.overdue)
    .map(({ l, sla }) => ({ leadId: l.id, minutes: sla.minutes, dedupeKey: `lead_sla:${l.id}` }));
}

/** Clave ISO de la semana (lunes) para deduplicar el resumen semanal. */
export function weekKey(today: ISODate): ISODate {
  const d = new Date(`${today}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
