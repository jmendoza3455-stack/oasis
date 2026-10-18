// SLA de primera respuesta (OASIS.md §5.3): minutos HÁBILES transcurridos desde que entró el
// lead. Fuera del horario comercial el reloj se detiene. Horario en hora de Lima (UTC-5, sin DST).

export type BusinessHours = { days: number[]; start: string; end: string };

const LIMA_OFFSET_MIN = -5 * 60;
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Minutos hábiles entre dos instantes. */
export function businessMinutesBetween(from: Date, to: Date, hours: BusinessHours): number {
  if (to <= from) return 0;
  const open = toMin(hours.start);
  const close = toMin(hours.end);
  let total = 0;
  // Recorre día a día en hora local de Lima
  const local = (d: Date) => new Date(d.getTime() + LIMA_OFFSET_MIN * 60_000);
  let cursor = local(from);
  const end = local(to);
  while (cursor < end) {
    const dayStart = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate());
    const nextDay = dayStart + 86_400_000;
    if (hours.days.includes(cursor.getUTCDay())) {
      const windowStart = Math.max(dayStart + open * 60_000, cursor.getTime());
      const windowEnd = Math.min(dayStart + close * 60_000, end.getTime());
      if (windowEnd > windowStart) total += (windowEnd - windowStart) / 60_000;
    }
    cursor = new Date(nextDay);
  }
  return Math.floor(total);
}

export type SlaState = { minutes: number; overdue: boolean; answered: boolean };

export function firstResponseSla(
  createdAt: Date,
  firstResponseAt: Date | null,
  now: Date,
  hours: BusinessHours,
  slaMinutes: number,
): SlaState {
  const minutes = businessMinutesBetween(createdAt, firstResponseAt ?? now, hours);
  return { minutes, overdue: minutes > slaMinutes, answered: firstResponseAt !== null };
}
