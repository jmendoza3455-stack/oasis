import { addDays, dayType, eachDay, season, weekday, type ISODate, type Season } from "./calendar";
import {
  bestPromotion,
  estimateRange,
  PricingError,
  type EventType,
  type PricingSettings,
  type Promotion,
  type RateCard,
} from "./pricing";

// Calendario vivo de la web pública: grilla del mes, estado por día y precio "desde".
// La BD solo informa libre / en espera / ocupado (public_availability); nunca datos de terceros.

/** "YYYY-MM" */
export type Month = string;
export type PublicDayStatus = "free" | "hold" | "taken" | "past";
export type PublicDay = {
  date: ISODate;
  status: PublicDayStatus;
  holiday: boolean;
  season: Season;
  /** Alquiler mínimo con IGV para ese día (solo con precios públicos). */
  from: number | null;
  /** Día con promoción vigente o tarifa de lunes a jueves (solo con precios públicos). */
  offer: boolean;
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(v: string): v is Month {
  return MONTH_RE.test(v);
}

export function monthOf(date: ISODate): Month {
  return date.slice(0, 7);
}

export function addMonths(month: Month, n: number): Month {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Meses de diferencia (b − a). */
export function monthsBetween(a: Month, b: Month): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

export function monthBounds(month: Month): { first: ISODate; last: ISODate } {
  const first = `${month}-01`;
  return { first, last: addDays(`${addMonths(month, 1)}-01`, -1) };
}

/** Celdas del mes en semanas de lunes a domingo; null = relleno fuera del mes. */
export function monthGrid(month: Month): (ISODate | null)[] {
  const { first, last } = monthBounds(month);
  const lead = (weekday(first) + 6) % 7; // lunes = 0
  const days: (ISODate | null)[] = [...Array<null>(lead).fill(null), ...eachDay(first, last)];
  while (days.length % 7) days.push(null);
  return days;
}

export function buildPublicMonth(input: {
  month: Month;
  today: ISODate;
  /** Solo días ocupados o en espera; el resto es libre. */
  occupancy: Readonly<Record<ISODate, "hold" | "taken">>;
  holidays: ReadonlySet<ISODate>;
  highSeasonMonths: readonly number[];
  pricing?: {
    cards: readonly RateCard[];
    promotions: readonly Promotion[];
    settings: PricingSettings;
    eventType: EventType;
    guests: number;
  } | null;
}): PublicDay[] {
  const { first, last } = monthBounds(input.month);
  return eachDay(first, last).map((date) => {
    const status: PublicDayStatus = date < input.today ? "past" : (input.occupancy[date] ?? "free");
    let from: number | null = null;
    let offer = false;
    if (input.pricing && status !== "past") {
      const p = input.pricing;
      const promotion = bestPromotion(
        p.promotions,
        { eventType: p.eventType, date },
        input.holidays,
      );
      try {
        from = estimateRange(
          p.cards,
          { eventType: p.eventType, date, guests: p.guests, promotion },
          input.holidays,
          p.settings,
        ).min;
        offer = promotion !== null || dayType(date, input.holidays) === "mon_thu";
      } catch (error) {
        if (!(error instanceof PricingError)) throw error;
      }
    }
    return {
      date,
      status,
      holiday: input.holidays.has(date),
      season: season(date, input.highSeasonMonths),
      from,
      offer,
    };
  });
}
