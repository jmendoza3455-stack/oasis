import { describe, expect, it } from "vitest";
import { businessMinutesBetween, firstResponseSla, type BusinessHours } from "@/lib/domain";

const hours: BusinessHours = { days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "19:00" };
// 2026-12-17 es jueves. 14:00Z = 09:00 en Lima.
const lima = (iso: string) => new Date(`${iso}-05:00`);

describe("SLA de primera respuesta (minutos hábiles)", () => {
  it("cuenta dentro del horario", () => {
    expect(
      businessMinutesBetween(lima("2026-12-17T10:00:00"), lima("2026-12-17T10:20:00"), hours),
    ).toBe(20);
  });

  it("el reloj se detiene fuera del horario y los domingos", () => {
    // sábado 18:50 → lunes 09:10: 10 min del sábado + 10 min del lunes
    expect(
      businessMinutesBetween(lima("2026-12-19T18:50:00"), lima("2026-12-21T09:10:00"), hours),
    ).toBe(20);
    // lead de madrugada respondido a las 09:05: 5 minutos
    expect(
      businessMinutesBetween(lima("2026-12-17T03:00:00"), lima("2026-12-17T09:05:00"), hours),
    ).toBe(5);
  });

  it("rango vacío o invertido es 0", () => {
    expect(
      businessMinutesBetween(lima("2026-12-17T10:00:00"), lima("2026-12-17T09:00:00"), hours),
    ).toBe(0);
  });

  it("marca vencido sobre 15 minutos hábiles", () => {
    const created = lima("2026-12-17T10:00:00");
    expect(firstResponseSla(created, null, lima("2026-12-17T10:10:00"), hours, 15)).toEqual({
      minutes: 10,
      overdue: false,
      answered: false,
    });
    expect(firstResponseSla(created, null, lima("2026-12-17T10:40:00"), hours, 15).overdue).toBe(
      true,
    );
    expect(
      firstResponseSla(
        created,
        lima("2026-12-17T10:12:00"),
        lima("2026-12-17T18:00:00"),
        hours,
        15,
      ),
    ).toEqual({
      minutes: 12,
      overdue: false,
      answered: true,
    });
  });
});
