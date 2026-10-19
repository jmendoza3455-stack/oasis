import { describe, expect, it } from "vitest";
import {
  addDays,
  applyDiscount,
  dayType,
  daysBetween,
  eachDay,
  formatDate,
  formatPEN,
  formatUSD,
  fromGross,
  fromNet,
  isWeekendOrHoliday,
  round2,
  season,
  weekday,
} from "@/lib/domain";

const holidays = new Set(["2026-12-08", "2026-12-25"]);

describe("money", () => {
  it("redondea a céntimos como Postgres", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(662.4)).toBe(662.4);
    expect(round2(1e-7)).toBe(0);
    expect(round2(-0.001)).toBe(0);
    expect(round2(1234567.895)).toBe(1234567.9);
  });

  it("separa IGV desde el neto igual que las columnas generadas", () => {
    expect(fromNet(5000, 0.18)).toEqual({ net: 5000, igv: 900, gross: 5900 });
    expect(fromNet(3680, 0.18)).toEqual({ net: 3680, igv: 662.4, gross: 4342.4 });
  });

  it("separa IGV desde el bruto", () => {
    expect(fromGross(4500, 0.18)).toEqual({ net: 3813.56, igv: 686.44, gross: 4500 });
  });

  it("valida tasas y descuentos", () => {
    expect(() => fromNet(100, 1.5)).toThrow("igv_rate_out_of_range");
    expect(() => fromGross(100, -0.1)).toThrow("igv_rate_out_of_range");
    expect(() => applyDiscount(100, 120)).toThrow("discount_pct_out_of_range");
    expect(applyDiscount(4000, 8)).toBe(3680);
  });

  it("formatea en soles y dólares", () => {
    expect(formatPEN(1500)).toMatch(/S\/\s?1,500\.00/);
    expect(formatUSD(375, 3.75)).toMatch(/100\.00/);
    expect(() => formatUSD(1, 0)).toThrow("usd_rate_invalid");
  });
});

describe("calendar", () => {
  it("calcula días de la semana sin depender de la zona horaria", () => {
    expect(weekday("2026-12-19")).toBe(6); // sábado
    expect(weekday("2026-12-20")).toBe(0); // domingo
  });

  it("clasifica tipo de día para el tarifario (feriado = domingo)", () => {
    expect(dayType("2026-12-17", holidays)).toBe("mon_thu");
    expect(dayType("2026-12-18", holidays)).toBe("fri");
    expect(dayType("2026-12-19", holidays)).toBe("sat");
    expect(dayType("2026-12-20", holidays)).toBe("sun_holiday");
    expect(dayType("2026-12-08", holidays)).toBe("sun_holiday"); // martes feriado
  });

  it("agrupa V-S-D y feriados vs L-J", () => {
    expect(isWeekendOrHoliday("2026-12-18", holidays)).toBe(true);
    expect(isWeekendOrHoliday("2026-12-08", holidays)).toBe(true);
    expect(isWeekendOrHoliday("2026-12-17", holidays)).toBe(false);
  });

  it("temporada alta dic–mar", () => {
    const high = [12, 1, 2, 3];
    expect(season("2026-12-19", high)).toBe("high");
    expect(season("2027-03-31", high)).toBe("high");
    expect(season("2027-04-01", high)).toBe("low");
  });

  it("aritmética de fechas y formato dd/mm/aaaa", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-12-17", "2027-03-16")).toBe(89);
    expect(eachDay("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect(eachDay("2027-01-02", "2027-01-01")).toEqual([]);
    expect(formatDate("2026-12-17")).toBe("17/12/2026");
  });

  it("rechaza fechas inválidas", () => {
    expect(() => weekday("2026-02-30")).toThrow("invalid_date");
    expect(() => formatDate("17/12/2026")).toThrow("invalid_date");
  });
});

describe("feriados", () => {
  it("calcula la Pascua (valores publicados) y la Semana Santa", async () => {
    const { easterSunday, peruHolidays } = await import("@/lib/domain");
    // Pascua: 2024-03-31, 2025-04-20, 2026-04-05, 2027-03-28, 2028-04-16, 2038-04-25
    expect([2024, 2025, 2026, 2027, 2028, 2038].map(easterSunday)).toEqual([
      "2024-03-31",
      "2025-04-20",
      "2026-04-05",
      "2027-03-28",
      "2028-04-16",
      "2038-04-25",
    ]);
    const h2028 = peruHolidays(2028);
    expect(h2028).toHaveLength(16);
    expect(h2028.filter((h) => /^(Jueves|Viernes) Santo$/.test(h.name)).map((h) => h.date)).toEqual(
      ["2028-04-13", "2028-04-14"],
    );
  });
});
