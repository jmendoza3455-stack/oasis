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
};

export type Quote = {
  rateCardId: string;
  dayType: DayType;
  season: Season;
  list: Amounts;
  discountPct: number;
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

  const discountPct = input.discountPct ?? 0;
  const requiresApproval = discountPct > settings.discountCapPct;
  if (requiresApproval && !input.discountApprovedByAdmin) {
    throw new PricingError("discount_requires_approval");
  }

  const listNet = round2(card.priceNet + card.pricePerGuestNet * input.guests);
  const list = fromNet(listNet, settings.igvRate);
  const rental = fromNet(applyDiscount(listNet, discountPct), settings.igvRate);

  return {
    rateCardId: card.id,
    dayType: card.dayType,
    season: card.season,
    list,
    discountPct,
    rental,
    requiresApproval,
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
