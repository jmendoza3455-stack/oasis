import { describe, expect, it } from "vitest";
import {
  averageTicket,
  cac,
  channelBreakEven,
  conversion,
  netRevenuePerAvailableDay,
  occupancy,
  roas,
  trafficLight,
  type DayBooking,
} from "@/lib/domain";

describe("ocupación (OASIS.md §4)", () => {
  // Enero 2027: 31 días. V-S-D: 1,2,3,8,9,10,15,16,17,22,23,24,29,30,31 = 15 días.
  // 01/01 es feriado y viernes (ya está en el grupo fin de semana). L-J = 16 días.
  const holidays = new Set(["2027-01-01"]);
  const blocked = new Set(["2027-01-05", "2027-01-06"]); // martes y miércoles en mantenimiento
  const bookings: DayBooking[] = [
    { date: "2027-01-02", status: "reserved" },
    { date: "2027-01-09", status: "confirmed" },
    { date: "2027-01-16", status: "done" },
    { date: "2027-01-23", status: "settled" },
    { date: "2027-01-24", status: "prebooked" }, // pre-reserva NO es día vendido
    { date: "2027-01-30", status: "cancelled" },
    { date: "2027-01-13", status: "reserved" }, // miércoles
    { date: "2027-01-14", status: "expired" },
  ];

  it("cuadra con el conteo manual del mes", () => {
    const o = occupancy("2027-01-01", "2027-01-31", bookings, blocked, holidays);
    expect(o.weekend).toEqual({ sold: 4, available: 15, rate: 4 / 15 });
    expect(o.weekday).toEqual({ sold: 1, available: 14, rate: 1 / 14 });
    expect(o.total).toEqual({ sold: 5, available: 29, rate: 5 / 29 });
  });

  it("un feriado L-J cuenta en el grupo fin de semana", () => {
    const o = occupancy(
      "2027-01-04",
      "2027-01-04",
      [{ date: "2027-01-04", status: "done" }],
      new Set(),
      new Set(["2027-01-04"]),
    );
    expect(o.weekend.sold).toBe(1);
    expect(o.weekday.available).toBe(0);
    expect(o.weekday.rate).toBeNull();
  });
});

describe("indicadores de control", () => {
  it("ingreso neto por día disponible", () => {
    expect(
      netRevenuePerAvailableDay({
        revenueNet: 20000,
        commissions: 225,
        directCosts: 2400,
        availableDays: 29,
      }),
    ).toBe(599.14);
    expect(
      netRevenuePerAvailableDay({
        revenueNet: 1,
        commissions: 0,
        directCosts: 0,
        availableDays: 0,
      }),
    ).toBeNull();
  });

  it("CAC, ROAS y ticket promedio", () => {
    expect(cac(1500, 2)).toBe(750);
    expect(cac(1500, 0)).toBeNull();
    expect(roas(9000, 1500)).toBe(6);
    expect(roas(9000, 0)).toBeNull();
    expect(averageTicket([4500, 2200, 2800])).toBe(3166.67);
    expect(averageTicket([])).toBeNull();
    expect(conversion(20, 5)).toBe(0.25);
    expect(conversion(0, 5)).toBeNull();
  });

  it("punto de equilibrio pauta vs planner (5 % del ticket)", () => {
    expect(channelBreakEven({ cac: 150, averageTicketNet: 4000, commissionRate: 0.05 })).toEqual({
      threshold: 200,
      adsCostMoreThanCommission: false,
    });
    expect(
      channelBreakEven({ cac: 750, averageTicketNet: 4000, commissionRate: 0.05 })
        .adsCostMoreThanCommission,
    ).toBe(true);
    expect(
      channelBreakEven({ cac: null, averageTicketNet: 4000, commissionRate: 0.05 })
        .adsCostMoreThanCommission,
    ).toBeNull();
    expect(channelBreakEven({ cac: 100, averageTicketNet: null, commissionRate: 0.05 })).toEqual({
      threshold: null,
      adsCostMoreThanCommission: null,
    });
  });

  it("semáforo de metas", () => {
    expect(trafficLight(0.55, 0.5)).toBe("green");
    expect(trafficLight(0.42, 0.5)).toBe("yellow");
    expect(trafficLight(0.3, 0.5)).toBe("red");
    expect(trafficLight(null, 0.5)).toBe("red");
  });
});
