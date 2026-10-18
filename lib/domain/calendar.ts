// Fechas de calendario como "YYYY-MM-DD" (fecha local de Lima, sin hora). Trabajar con strings
// evita errores de zona horaria: el día comercial ya se resolvió al guardar la reserva.

export type ISODate = string;
export type DayType = "mon_thu" | "fri" | "sat" | "sun_holiday";
export type Season = "high" | "low";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function toUTC(date: ISODate): Date {
  if (!ISO.test(date)) throw new RangeError(`invalid_date: ${date}`);
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
    throw new RangeError(`invalid_date: ${date}`);
  }
  return d;
}

/** 0 = domingo … 6 = sábado */
export function weekday(date: ISODate): number {
  return toUTC(date).getUTCDay();
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

/** Fechas desde `from` hasta `to`, ambas inclusive. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const n = daysBetween(from, to);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

/** Tipo de día para el tarifario. Un feriado se cobra como domingo. */
export function dayType(date: ISODate, holidays: ReadonlySet<ISODate>): DayType {
  if (holidays.has(date)) return "sun_holiday";
  const w = weekday(date);
  if (w === 0) return "sun_holiday";
  if (w === 6) return "sat";
  if (w === 5) return "fri";
  return "mon_thu";
}

/** Grupo de ocupación de OASIS.md §4: V-S-D y feriados vs. L-J. */
export function isWeekendOrHoliday(date: ISODate, holidays: ReadonlySet<ISODate>): boolean {
  return holidays.has(date) || [0, 5, 6].includes(weekday(date));
}

export function season(date: ISODate, highSeasonMonths: readonly number[]): Season {
  const month = toUTC(date).getUTCMonth() + 1;
  return highSeasonMonths.includes(month) ? "high" : "low";
}

/** "dd/mm/aaaa" */
export function formatDate(date: ISODate): string {
  const [y, m, d] = date.split("-");
  toUTC(date);
  return `${d}/${m}/${y}`;
}
