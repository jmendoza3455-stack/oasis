import { dayType, season, type DayType, type ISODate, type Season } from "./calendar";
import { applyDiscount, fromNet, round2, type Amounts } from "./money";

export type EventType = "wedding" | "social" | "corporate" | "family_day";
export type Slot = "full_day" | "night" | "full_day_and_night";

/** Fila de rate_cards (precios SIN IGV). */
export type RateCard = {
  id: string;
  eventType: EventType;
  slot: Slot;
  dayType: DayType;
  season: Season;
  guestsMin: number;
  guestsMax: number;
  priceNet: number;
  pricePerGuestNet: number;
  validFrom: ISODate;
  validTo: ISODate | null;
};

export type PricingSettings = {
  igvRate: number;
  highSeasonMonths: readonly number[];
  discountCapPct: number;
  depositPct: number;
  guaranteeAmounts: Partial<Record<EventType, number>>;
  /** Amplitud del rango del cotizador público (0.1 = ±10 %). */
  quoteRangeSpread?: number;
};

export type QuoteInput = {
  eventType: EventType;
  slot?: Slot;
  date: ISODate;
  guests: number;
  discountPct?: number;
  discountApprovedByAdmin?: boolean;
  /** Promoción vigente (creada por el admin, siempre dentro del tope de descuento). */
  promotion?: Promotion | null;
};

/** Promoción creada por el admin: % de descuento por fechas, segmentos y tipos de día. */
export type Promotion = {
  id: string;
  name: string;
  eventTypes: readonly EventType[] | null; // null = todos
  dayTypes: readonly DayType[] | null; // null = todos
  startsOn: ISODate;
  endsOn: ISODate;
  discountPct: number;
};

/** La promoción aplicable con mayor descuento para un tipo de evento y fecha. */
export function bestPromotion(
  promotions: readonly Promotion[],
  input: { eventType: EventType; date: ISODate },
  holidays: ReadonlySet<ISODate>,
): Promotion | null {
  const dt = dayType(input.date, holidays);
  const applicable = promotions.filter(
    (p) =>
      p.discountPct > 0 &&
      p.startsOn <= input.date &&
      p.endsOn >= input.date &&
      (p.eventTypes === null || p.eventTypes.includes(input.eventType)) &&
      (p.dayTypes === null || p.dayTypes.includes(dt)),
  );
  applicable.sort((a, b) => b.discountPct - a.discountPct);
  return applicable[0] ?? null;
}

export type Quote = {
  rateCardId: string;
  dayType: DayType;
  season: Season;
  list: Amounts;
  discountPct: number;
  /** Promoción aplicada (si dio el mayor descuento). */
  promotion: Promotion | null;
  rental: Amounts;
  requiresApproval: boolean;
  deposit: number;
  guarantee: number;
};

export class PricingError extends Error {
  constructor(public code: "no_rate_card" | "invalid_guests" | "discount_requires_approval") {
    super(code);
  }
}

export function findRateCard(
  cards: readonly RateCard[],
  input: { eventType: EventType; slot: Slot; date: ISODate; guests: number },
  holidays: ReadonlySet<ISODate>,
  highSeasonMonths: readonly number[],
): RateCard | null {
  const dt = dayType(input.date, holidays);
  const s = season(input.date, highSeasonMonths);
  const matches = cards.filter(
    (c) =>
      c.eventType === input.eventType &&
      c.slot === input.slot &&
      c.dayType === dt &&
      c.season === s &&
      input.guests >= c.guestsMin &&
      input.guests <= c.guestsMax &&
      c.validFrom <= input.date &&
      (c.validTo === null || c.validTo >= input.date),
  );
  // La tarifa vigente más reciente gana
  matches.sort((a, b) => (a.validFrom < b.validFrom ? 1 : a.validFrom > b.validFrom ? -1 : 0));
  return matches[0] ?? null;
}

/**
 * Tarifa para tipo de evento × día × temporada × aforo, con descuento y su tope (OASIS.md §9).
 * Devuelve montos con y sin IGV, adelanto (sobre el total con IGV) y garantía.
 */
export function quote(
  cards: readonly RateCard[],
  input: QuoteInput,
  holidays: ReadonlySet<ISODate>,
  settings: PricingSettings,
): Quote {
  if (!Number.isInteger(input.guests) || input.guests <= 0)
    throw new PricingError("invalid_guests");
  const slot = input.slot ?? "full_day";
  const card = findRateCard(cards, { ...input, slot }, holidays, settings.highSeasonMonths);
  if (!card) throw new PricingError("no_rate_card");

  const manualPct = input.discountPct ?? 0;
  const requiresApproval = manualPct > settings.discountCapPct;
  if (requiresApproval && !input.discountApprovedByAdmin) {
    throw new PricingError("discount_requires_approval");
  }
  // La promoción no se suma al descuento manual: gana el mayor, y nunca pasa el tope
  const promoPct = Math.min(input.promotion?.discountPct ?? 0, settings.discountCapPct);
  const promotion = input.promotion && promoPct > manualPct ? input.promotion : null;
  const discountPct = promotion ? promoPct : manualPct;

  const listNet = round2(card.priceNet + card.pricePerGuestNet * input.guests);
  const list = fromNet(listNet, settings.igvRate);
  const rental = fromNet(applyDiscount(listNet, discountPct), settings.igvRate);

  return {
    rateCardId: card.id,
    dayType: card.dayType,
    season: card.season,
    list,
    discountPct,
    promotion,
    rental,
    requiresApproval: requiresApproval && !promotion,
    deposit: round2(rental.gross * settings.depositPct),
    guarantee: settings.guaranteeAmounts[input.eventType] ?? 0,
  };
}

/** Rango del cotizador público (con IGV, redondeado a S/ 50). */
export function estimateRange(
  cards: readonly RateCard[],
  input: Omit<QuoteInput, "discountPct" | "discountApprovedByAdmin">,
  holidays: ReadonlySet<ISODate>,
  settings: PricingSettings,
): { min: number; max: number; base: Quote } {
  const base = quote(cards, input, holidays, settings);
  const spread = settings.quoteRangeSpread ?? 0.1;
  const to50 = (v: number) => Math.round(v / 50) * 50;
  return {
    min: to50(base.rental.gross * (1 - spread)),
    max: to50(base.rental.gross * (1 + spread)),
    base,
  };
}
