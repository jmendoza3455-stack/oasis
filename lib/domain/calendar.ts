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

/** Domingo de Pascua (algoritmo gregoriano anónimo de Meeus/Jones/Butcher). */
export function easterSunday(year: number): ISODate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Feriados nacionales del D.L. 713, art. 6, con sus modificatorias (Leyes 31530, 31788 y 31822).
// Fuente y estado: docs/research/261018 Feriados Peru 2026-2027.md (por validar con El Peruano).
const FIXED_HOLIDAYS: readonly [string, string][] = [
  ["01-01", "Año Nuevo"],
  ["05-01", "Día del Trabajo"],
  ["06-07", "Batalla de Arica y Día de la Bandera"],
  ["06-29", "San Pedro y San Pablo"],
  ["07-23", "Día de la Fuerza Aérea del Perú"],
  ["07-28", "Fiestas Patrias"],
  ["07-29", "Fiestas Patrias"],
  ["08-06", "Batalla de Junín"],
  ["08-30", "Santa Rosa de Lima"],
  ["10-08", "Combate de Angamos"],
  ["11-01", "Día de Todos los Santos"],
  ["12-08", "Inmaculada Concepción"],
  ["12-09", "Batalla de Ayacucho"],
  ["12-25", "Navidad"],
];

/** Feriados nacionales de un año (fijos + Jueves y Viernes Santo según la Pascua). */
export function peruHolidays(year: number): { date: ISODate; name: string }[] {
  const easter = easterSunday(year);
  return [
    ...FIXED_HOLIDAYS.map(([md, name]) => ({ date: `${year}-${md}`, name })),
    { date: addDays(easter, -3), name: "Jueves Santo" },
    { date: addDays(easter, -2), name: "Viernes Santo" },
  ].sort((x, y) => x.date.localeCompare(y.date));
}
