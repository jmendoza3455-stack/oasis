import "server-only";
import { withDb } from "@/lib/db";
import type { PricingSettings, RateCard } from "@/lib/domain";

export type PricingContext = {
  cards: RateCard[];
  holidays: Set<string>;
  settings: PricingSettings;
};

export async function loadPricingContext(venueId: string): Promise<PricingContext> {
  return withDb({ kind: "service" }, async (sql) => {
    const cards = await sql<RateCard>(
      `select id, event_type as "eventType", slot, day_type as "dayType", season,
              guests_min as "guestsMin", guests_max as "guestsMax", price_net::float8 as "priceNet",
              price_per_guest_net::float8 as "pricePerGuestNet",
              to_char(valid_from, 'YYYY-MM-DD') as "validFrom", to_char(valid_to, 'YYYY-MM-DD') as "validTo"
         from rate_cards where venue_id = $1`,
      [venueId],
    );
    const holidays = await sql<{ d: string }>(
      `select to_char(date, 'YYYY-MM-DD') as d from holidays where type = 'feriado'`,
    );
    const rows = await sql<{ key: string; value: unknown }>(
      `select key, value from settings where venue_id = $1`,
      [venueId],
    );
    const s = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
    return {
      cards,
      holidays: new Set(holidays.map((h) => h.d)),
      settings: {
        igvRate: Number(s.igv_rate ?? 0.18),
        highSeasonMonths: (s.high_season_months as number[]) ?? [12, 1, 2, 3],
        discountCapPct: Number(s.discount_cap_pct ?? 10),
        depositPct: Number(s.deposit_pct ?? 0.5),
        guaranteeAmounts: (s.guarantee_amounts as PricingSettings["guaranteeAmounts"]) ?? {},
        quoteRangeSpread: Number(s.quote_range_spread ?? 0.1),
      },
    };
  });
}
