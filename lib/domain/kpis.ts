import { eachDay, isWeekendOrHoliday, type ISODate } from "./calendar";
import { SOLD_STATUSES, type BookingStatus } from "./booking";
import { round2 } from "./money";

// Fórmulas exactas de OASIS.md §4. Todas son puras: reciben los datos ya filtrados por venue.

export type DayBooking = { date: ISODate; status: BookingStatus };
export type OccupancyGroup = { sold: number; available: number; rate: number | null };
export type Occupancy = { total: OccupancyGroup; weekend: OccupancyGroup; weekday: OccupancyGroup };

const group = (sold: number, available: number): OccupancyGroup => ({
  sold,
  available,
  rate: available > 0 ? sold / available : null,
});

/**
 * Ocupación = días vendidos (Separada, Confirmada, Realizada, Liquidada) / días disponibles
 * (calendario menos bloqueos). Separada en V-S-D + feriados vs. L-J.
 */
export function occupancy(
  from: ISODate,
  to: ISODate,
  bookings: readonly DayBooking[],
  blockedDays: ReadonlySet<ISODate>,
  holidays: ReadonlySet<ISODate>,
): Occupancy {
  const soldDays = new Set(
    bookings.filter((b) => SOLD_STATUSES.includes(b.status)).map((b) => b.date),
  );
  const acc = { weekend: { sold: 0, available: 0 }, weekday: { sold: 0, available: 0 } };
  for (const day of eachDay(from, to)) {
    if (blockedDays.has(day)) continue;
    const g = isWeekendOrHoliday(day, holidays) ? acc.weekend : acc.weekday;
    g.available += 1;
    if (soldDays.has(day)) g.sold += 1;
  }
  return {
    weekend: group(acc.weekend.sold, acc.weekend.available),
    weekday: group(acc.weekday.sold, acc.weekday.available),
    total: group(
      acc.weekend.sold + acc.weekday.sold,
      acc.weekend.available + acc.weekday.available,
    ),
  };
}

/** Ingreso neto por día disponible = (ingreso sin IGV − comisiones − costos directos) / días disponibles. */
export function netRevenuePerAvailableDay(input: {
  revenueNet: number;
  commissions: number;
  directCosts: number;
  availableDays: number;
}): number | null {
  if (input.availableDays <= 0) return null;
  return round2((input.revenueNet - input.commissions - input.directCosts) / input.availableDays);
}

/** CAC por evento directo cerrado. */
export function cac(spend: number, closedDirectEvents: number): number | null {
  return closedDirectEvents > 0 ? round2(spend / closedDirectEvents) : null;
}

export function roas(revenueNet: number, spend: number): number | null {
  return spend > 0 ? round2(revenueNet / spend) : null;
}

export function averageTicket(revenuesNet: readonly number[]): number | null {
  return revenuesNet.length > 0
    ? round2(revenuesNet.reduce((a, b) => a + b, 0) / revenuesNet.length)
    : null;
}

/**
 * Regla de canal (OASIS.md §4): el directo conviene mientras CAC < comisión del planner
 * (5 % del ticket). Devuelve el umbral y si la pauta ya cuesta más que la comisión.
 */
export function channelBreakEven(input: {
  cac: number | null;
  averageTicketNet: number | null;
  commissionRate: number;
}): { threshold: number | null; adsCostMoreThanCommission: boolean | null } {
  if (input.averageTicketNet === null) return { threshold: null, adsCostMoreThanCommission: null };
  const threshold = round2(input.averageTicketNet * input.commissionRate);
  return {
    threshold,
    adsCostMoreThanCommission: input.cac === null ? null : input.cac > threshold,
  };
}

export type Traffic = "green" | "yellow" | "red";

/** Semáforo de metas: verde ≥ meta, amarillo ≥ 80 % de la meta, rojo debajo. */
export function trafficLight(value: number | null, target: number, yellowRatio = 0.8): Traffic {
  if (value === null) return "red";
  if (value >= target) return "green";
  return value >= target * yellowRatio ? "yellow" : "red";
}

/** Conversión entre etapas (p. ej. leads → separados). */
export function conversion(from: number, to: number): number | null {
  return from > 0 ? to / from : null;
}

/** NPS = % promotores (9–10) − % detractores (0–6). */
export function nps(scores: readonly number[]): number | null {
  if (scores.length === 0) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

export type OccupancyTargets = {
  weekend: { m3: number; m6: number };
  weekday: { m6: number };
};

/**
 * Meta del mes según los meses transcurridos desde la reapertura (1 = mes de reapertura).
 * Fin de semana: m3 hasta el mes 3, m6 desde el mes 4. Entre semana: m6 escalonado linealmente.
 */
export function occupancyTarget(monthIndex: number, targets: OccupancyTargets) {
  if (monthIndex < 1) return { weekend: null, weekday: null };
  const weekend = monthIndex <= 3 ? targets.weekend.m3 : targets.weekend.m6;
  const weekday = Math.round(targets.weekday.m6 * Math.min(1, monthIndex / 6) * 1000) / 1000;
  return { weekend, weekday };
}

/** Meses entre la reapertura y un mes dado (ambos "YYYY-MM-DD"); el mes de reapertura es 1. */
export function monthsSince(reopening: string, month: string): number {
  const [ry, rm] = reopening.split("-").map(Number);
  const [y, m] = month.split("-").map(Number);
  return (y - ry) * 12 + (m - rm) + 1;
}
