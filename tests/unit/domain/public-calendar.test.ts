import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addMonths,
  bestPromotion,
  buildPublicMonth,
  estimateRange,
  quote,
  isMonth,
  monthBounds,
  monthGrid,
  monthOf,
  monthsBetween,
  type PricingSettings,
  type Promotion,
  type RateCard,
} from "@/lib/domain";

const settings: PricingSettings = {
  igvRate: 0.18,
  highSeasonMonths: [12, 1, 2, 3],
  discountCapPct: 10,
  depositPct: 0.5,
  guaranteeAmounts: {},
  quoteRangeSpread: 0,
};
const card = (dayType: RateCard["dayType"], priceNet: number): RateCard => ({
  id: `c-${dayType}`,
  eventType: "corporate",
  slot: "full_day",
  dayType,
  season: "low",
  guestsMin: 1,
  guestsMax: 150,
  priceNet,
  pricePerGuestNet: 0,
  validFrom: "2026-01-01",
  validTo: null,
});
const cards = [
  card("mon_thu", 2000),
  card("fri", 3000),
  card("sat", 4000),
  card("sun_holiday", 3500),
];

describe("meses", () => {
  it("valida, suma y resta meses cruzando años", () => {
    expect(isMonth("2027-01")).toBe(true);
    expect(isMonth("2027-13")).toBe(false);
    expect(monthOf("2026-10-19")).toBe("2026-10");
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(monthsBetween("2026-10", "2028-04")).toBe(18);
    expect(monthBounds("2028-02")).toEqual({ first: "2028-02-01", last: "2028-02-29" });
  });

  it("arma la grilla de lunes a domingo con relleno", () => {
    // Octubre 2026 empieza en jueves: 3 celdas vacías (lun, mar, mié)
    const grid = monthGrid("2026-10");
    expect(grid.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(31);
    // Febrero 2027 empieza en lunes y cierra la semana justo: sin relleno
    expect(monthGrid("2027-02")[0]).toBe("2027-02-01");
  });
});

describe("buildPublicMonth", () => {
  const base = {
    month: "2026-10",
    today: "2026-10-19",
    occupancy: { "2026-10-24": "taken", "2026-10-30": "hold" } as const,
    holidays: new Set(["2026-11-01"]),
    highSeasonMonths: settings.highSeasonMonths,
  };

  it("marca pasados, ocupados, en espera y libres sin precios", () => {
    const days = buildPublicMonth(base);
    const at = (d: string) => days.find((x) => x.date === d)!;
    expect(days).toHaveLength(31);
    expect(at("2026-10-18").status).toBe("past");
    expect(at("2026-10-19").status).toBe("free");
    expect(at("2026-10-24").status).toBe("taken");
    expect(at("2026-10-30").status).toBe("hold");
    expect(at("2026-10-20")).toMatchObject({ from: null, offer: false, season: "low" });
  });

  it("calcula el precio desde por día, resalta L-J y promociones", () => {
    const promo: Promotion = {
      id: "p1",
      name: "Viernes corporativo",
      eventTypes: ["corporate"],
      dayTypes: ["fri"],
      startsOn: "2026-10-01",
      endsOn: "2026-10-31",
      discountPct: 10,
    };
    const days = buildPublicMonth({
      ...base,
      month: "2026-11",
      pricing: { cards, promotions: [promo], settings, eventType: "corporate", guests: 40 },
    });
    const at = (d: string) => days.find((x) => x.date === d)!;
    expect(at("2026-11-02")).toMatchObject({ from: 2350, offer: true }); // lunes: 2000 + IGV
    expect(at("2026-11-07")).toMatchObject({ from: 4700, offer: false }); // sábado
    expect(at("2026-11-01")).toMatchObject({ holiday: true, from: 4150 }); // domingo/feriado
    // La promoción vence el 31/10: en octubre el viernes sale con descuento y como oferta
    const oct = buildPublicMonth({
      ...base,
      pricing: { cards, promotions: [promo], settings, eventType: "corporate", guests: 40 },
    });
    expect(oct.find((x) => x.date === "2026-10-23")).toMatchObject({ offer: true, from: 3200 });
    expect(oct.find((x) => x.date === "2026-10-18")).toMatchObject({ from: null }); // pasado
  });

  it("sin tarifa para el aforo no muestra precio", () => {
    const days = buildPublicMonth({
      ...base,
      pricing: { cards, promotions: [], settings, eventType: "corporate", guests: 400 },
    });
    expect(days.every((d) => d.from === null && !d.offer)).toBe(true);
  });
});

describe("precio del calendario = rango del cotizador ⊇ precio de la cotización (propiedad)", () => {
  // Misma fuente de verdad: el "desde" de cada día es el mínimo de estimateRange (lo que muestra
  // el cotizador al tocar el día), y quote() —el precio que se guarda en la pre-reserva y sale en
  // el PDF— cae siempre dentro de ese rango.
  const dayTypes = ["mon_thu", "fri", "sat", "sun_holiday"] as const;
  const seasons = ["low", "high"] as const;
  const arbCards = fc
    .tuple(
      ...dayTypes.flatMap(() => seasons.map(() => fc.integer({ min: 500, max: 12_000 }))),
      fc.integer({ min: 0, max: 60 }),
    )
    .map((prices) =>
      dayTypes.flatMap((dayType, i) =>
        seasons.map((s, j): RateCard => ({
          id: `${dayType}-${s}`,
          eventType: "wedding",
          slot: "full_day",
          dayType,
          season: s,
          guestsMin: 1,
          guestsMax: 150,
          priceNet: prices[i * 2 + j],
          pricePerGuestNet: prices[8],
          validFrom: "2026-01-01",
          validTo: null,
        })),
      ),
    );
  const arbPromo = fc.option(
    fc.record({
      discountPct: fc.integer({ min: 1, max: 10 }),
      dayTypes: fc.subarray([...dayTypes], { minLength: 1 }),
    }),
    { nil: null },
  );

  it("para cualquier tarifario, día, aforo y promoción", () => {
    fc.assert(
      fc.property(
        arbCards,
        arbPromo,
        fc.integer({ min: 0, max: 17 }),
        fc.integer({ min: 1, max: 150 }),
        (cards, promo, monthOffset, guests) => {
          const month = addMonths("2026-11", monthOffset);
          const promotions: Promotion[] = promo
            ? [
                {
                  id: "p",
                  name: "Promo",
                  eventTypes: ["wedding"],
                  dayTypes: promo.dayTypes,
                  startsOn: "2026-01-01",
                  endsOn: "2028-12-31",
                  discountPct: promo.discountPct,
                },
              ]
            : [];
          const s = { ...settings, quoteRangeSpread: 0.1 };
          const holidays = new Set(["2026-12-25", "2027-07-28"]);
          const days = buildPublicMonth({
            month,
            today: "2026-10-19",
            occupancy: {},
            holidays,
            highSeasonMonths: s.highSeasonMonths,
            pricing: { cards, promotions, settings: s, eventType: "wedding", guests },
          });
          for (const d of days) {
            const promotion = bestPromotion(
              promotions,
              { eventType: "wedding", date: d.date },
              holidays,
            );
            const range = estimateRange(
              cards,
              { eventType: "wedding", date: d.date, guests, promotion },
              holidays,
              s,
            );
            const exact = quote(
              cards,
              { eventType: "wedding", date: d.date, guests, promotion },
              holidays,
              s,
            );
            expect(d.from).toBe(range.min);
            expect(exact.rental.gross).toBeGreaterThanOrEqual(range.min);
            expect(exact.rental.gross).toBeLessThanOrEqual(range.max);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
