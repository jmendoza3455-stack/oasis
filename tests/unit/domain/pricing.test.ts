import { describe, expect, it } from "vitest";
import {
  bestPromotion,
  estimateRange,
  findRateCard,
  PricingError,
  quote,
  type PricingSettings,
  type Promotion,
  type RateCard,
} from "@/lib/domain";

const base = {
  slot: "full_day" as const,
  guestsMin: 1,
  pricePerGuestNet: 0,
  validFrom: "2026-01-01",
  validTo: null,
};
const cards: RateCard[] = [
  {
    ...base,
    id: "w-sat-low",
    eventType: "wedding",
    dayType: "sat",
    season: "low",
    guestsMax: 150,
    priceNet: 4500,
  },
  {
    ...base,
    id: "w-sat-high",
    eventType: "wedding",
    dayType: "sat",
    season: "high",
    guestsMax: 150,
    priceNet: 5200,
  },
  {
    ...base,
    id: "w-sun-high",
    eventType: "wedding",
    dayType: "sun_holiday",
    season: "high",
    guestsMax: 150,
    priceNet: 4400,
  },
  {
    ...base,
    id: "fd-sun-high",
    eventType: "family_day",
    dayType: "sun_holiday",
    season: "high",
    guestsMax: 60,
    priceNet: 2800,
  },
  {
    ...base,
    id: "corp-pp",
    eventType: "corporate",
    dayType: "mon_thu",
    season: "low",
    guestsMin: 30,
    guestsMax: 150,
    priceNet: 0,
    pricePerGuestNet: 150,
  },
  // Tarifa más nueva que reemplaza a la de sábado alta desde 2027
  {
    ...base,
    id: "w-sat-high-2027",
    eventType: "wedding",
    dayType: "sat",
    season: "high",
    guestsMax: 150,
    priceNet: 5600,
    validFrom: "2027-01-01",
  },
];
const settings: PricingSettings = {
  igvRate: 0.18,
  highSeasonMonths: [12, 1, 2, 3],
  discountCapPct: 10,
  depositPct: 0.5,
  guaranteeAmounts: { wedding: 1000, family_day: 500 },
};
const holidays = new Set(["2026-12-08"]);

describe("pricing", () => {
  it("tarifa por tipo × día × temporada con y sin IGV", () => {
    const q = quote(
      cards,
      { eventType: "wedding", date: "2026-12-19", guests: 120 },
      holidays,
      settings,
    );
    expect(q.rateCardId).toBe("w-sat-high");
    expect(q.rental).toEqual({ net: 5200, igv: 936, gross: 6136 });
    expect(q.deposit).toBe(3068);
    expect(q.guarantee).toBe(1000);
    expect(q.requiresApproval).toBe(false);
  });

  it("un feriado entre semana se cobra como domingo", () => {
    const q = quote(
      cards,
      { eventType: "wedding", date: "2026-12-08", guests: 80 },
      holidays,
      settings,
    );
    expect(q.rateCardId).toBe("w-sun-high");
  });

  it("tarifa por persona y aforo mínimo", () => {
    const q = quote(
      cards,
      { eventType: "corporate", date: "2026-10-22", guests: 40 },
      holidays,
      settings,
    );
    expect(q.list.net).toBe(6000);
    expect(() =>
      quote(cards, { eventType: "corporate", date: "2026-10-22", guests: 20 }, holidays, settings),
    ).toThrow("no_rate_card");
  });

  it("aforo sobre el máximo no tiene tarifa", () => {
    expect(() =>
      quote(cards, { eventType: "family_day", date: "2026-12-20", guests: 80 }, holidays, settings),
    ).toThrow(PricingError);
  });

  it("la tarifa vigente más reciente gana", () => {
    const card = findRateCard(
      cards,
      { eventType: "wedding", slot: "full_day", date: "2027-01-16", guests: 100 },
      holidays,
      settings.highSeasonMonths,
    );
    expect(card?.id).toBe("w-sat-high-2027");
  });

  it("descuento dentro del tope se aplica; sobre el tope exige aprobación del admin", () => {
    const ok = quote(
      cards,
      { eventType: "wedding", date: "2026-10-17", guests: 100, discountPct: 8 },
      holidays,
      settings,
    );
    expect(ok.rental.net).toBe(4140);
    expect(ok.list.net).toBe(4500);
    expect(() =>
      quote(
        cards,
        { eventType: "wedding", date: "2026-10-17", guests: 100, discountPct: 15 },
        holidays,
        settings,
      ),
    ).toThrow("discount_requires_approval");
    const approved = quote(
      cards,
      {
        eventType: "wedding",
        date: "2026-10-17",
        guests: 100,
        discountPct: 15,
        discountApprovedByAdmin: true,
      },
      holidays,
      settings,
    );
    expect(approved.requiresApproval).toBe(true);
    expect(approved.rental.net).toBe(3825);
  });

  it("valida invitados", () => {
    expect(() =>
      quote(cards, { eventType: "wedding", date: "2026-10-17", guests: 0 }, holidays, settings),
    ).toThrow("invalid_guests");
  });

  it("sin garantía configurada usa 0", () => {
    const q = quote(
      cards,
      { eventType: "corporate", date: "2026-10-22", guests: 30 },
      holidays,
      settings,
    );
    expect(q.guarantee).toBe(0);
  });

  it("rango del cotizador público", () => {
    const r = estimateRange(
      cards,
      { eventType: "family_day", date: "2026-12-20", guests: 40 },
      holidays,
      settings,
    );
    expect(r.base.rental.gross).toBe(3304);
    expect(r).toMatchObject({ min: 2950, max: 3650 });
    const wide = estimateRange(
      cards,
      { eventType: "family_day", date: "2026-12-20", guests: 40 },
      holidays,
      { ...settings, quoteRangeSpread: 0.2 },
    );
    expect(wide.min).toBe(2650);
  });
});

describe("promociones", () => {
  // 2026-06-09 es martes (L-J), temporada baja
  const ljCorp: Promotion = {
    id: "p1",
    name: "Corporativo L-J",
    eventTypes: ["corporate"],
    dayTypes: ["mon_thu"],
    startsOn: "2026-06-01",
    endsOn: "2026-06-30",
    discountPct: 8,
  };
  const all: Promotion = {
    ...ljCorp,
    id: "p2",
    name: "Todo junio",
    eventTypes: null,
    dayTypes: null,
    discountPct: 5,
  };
  const holidays = new Set<string>();

  it("elige la promoción aplicable con mayor descuento", () => {
    expect(
      bestPromotion([all, ljCorp], { eventType: "corporate", date: "2026-06-09" }, holidays)?.id,
    ).toBe("p1");
    expect(
      bestPromotion([all, ljCorp], { eventType: "wedding", date: "2026-06-09" }, holidays)?.id,
    ).toBe("p2");
    expect(
      bestPromotion([ljCorp], { eventType: "corporate", date: "2026-06-13" }, holidays),
    ).toBeNull(); // sábado
    expect(
      bestPromotion([ljCorp], { eventType: "corporate", date: "2026-07-07" }, holidays),
    ).toBeNull(); // fuera de rango
    expect(
      bestPromotion(
        [{ ...all, discountPct: 0 }],
        { eventType: "wedding", date: "2026-06-09" },
        holidays,
      ),
    ).toBeNull();
  });

  it("aplica la promoción sin pedir aprobación, gana el mayor descuento y nunca pasa el tope", () => {
    const input = { eventType: "corporate" as const, date: "2026-06-09", guests: 40 };
    const q = quote(cards, { ...input, promotion: ljCorp }, holidays, settings);
    expect(q.discountPct).toBe(8);
    expect(q.promotion?.id).toBe("p1");
    expect(q.rental.net).toBe(5520); // 6,000 − 8 %
    expect(q.requiresApproval).toBe(false);
    // El descuento manual mayor gana y la promoción no se suma
    const manual = quote(
      cards,
      { ...input, promotion: ljCorp, discountPct: 9 },
      holidays,
      settings,
    );
    expect(manual.discountPct).toBe(9);
    expect(manual.promotion).toBeNull();
    // Una promoción por encima del tope se recorta al tope
    const capped = quote(
      cards,
      { ...input, promotion: { ...ljCorp, discountPct: 30 } },
      holidays,
      settings,
    );
    expect(capped.discountPct).toBe(settings.discountCapPct);
    expect(capped.requiresApproval).toBe(false);
  });
});
