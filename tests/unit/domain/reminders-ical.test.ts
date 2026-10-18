import { describe, expect, it } from "vitest";
import {
  balanceOf,
  buildIcs,
  dueReminders,
  icsEscape,
  icsFold,
  slaBreaches,
  weekKey,
  type ReminderBooking,
} from "@/lib/domain";

const base: ReminderBooking = {
  id: "b1",
  status: "reserved",
  eventDate: "2027-02-20",
  balanceDueOn: "2027-02-05",
  rentalGross: 5310,
  paidValidated: 2655,
};
const kinds = (b: Partial<ReminderBooking>, today: string) =>
  dueReminders([{ ...base, ...b }], today, { balanceNoticeDays: 3 }).map((r) => r.kind);

describe("dueReminders", () => {
  it("avisa el saldo dentro de la ventana previa, el día del vencimiento y vencido", () => {
    expect(kinds({}, "2027-02-01")).toEqual([]);
    expect(kinds({}, "2027-02-02")).toEqual(["balance_due_soon"]);
    expect(kinds({}, "2027-02-05")).toEqual(["balance_due_today"]);
    expect(kinds({}, "2027-02-06")).toEqual(["balance_overdue"]);
  });

  it("no avisa saldo si está pagado o sin fecha de vencimiento", () => {
    expect(kinds({ paidValidated: 5310 }, "2027-02-05")).toEqual([]);
    expect(kinds({ balanceDueOn: null }, "2027-02-05")).toEqual([]);
  });

  it("avisa D-7 y D-1 una vez por ventana", () => {
    const paid = { paidValidated: 5310 };
    expect(kinds(paid, "2027-02-12")).toEqual([]);
    expect(kinds(paid, "2027-02-13")).toEqual(["event_d7"]);
    expect(kinds(paid, "2027-02-18")).toEqual(["event_d7"]);
    expect(kinds(paid, "2027-02-19")).toEqual(["event_d1"]);
    expect(kinds(paid, "2027-02-20")).toEqual(["event_d1"]);
    expect(kinds(paid, "2027-02-21")).toEqual([]);
  });

  it("ignora estados no activos y usa claves de idempotencia estables", () => {
    expect(kinds({ status: "prebooked" }, "2027-02-19")).toEqual([]);
    expect(kinds({ status: "cancelled" }, "2027-02-19")).toEqual([]);
    const [r] = dueReminders([{ ...base, status: "confirmed" }], "2027-02-19", {
      balanceNoticeDays: 3,
    });
    expect(r).toEqual({
      kind: "balance_overdue",
      bookingId: "b1",
      dedupeKey: "balance_overdue:b1",
    });
  });

  it("calcula el saldo sin negativos", () => {
    expect(balanceOf({ rentalGross: 100, paidValidated: 150 })).toBe(0);
    expect(balanceOf({ rentalGross: 100.1, paidValidated: 50.05 })).toBe(50.05);
  });
});

describe("slaBreaches", () => {
  const hours = { days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "19:00" };
  // Lunes 18/01/2027 10:00 Lima = 15:00 UTC
  const created = new Date("2027-01-18T15:00:00Z");
  it("alerta solo leads nuevos sin respuesta fuera del SLA hábil", () => {
    const now = new Date("2027-01-18T15:30:00Z");
    const leads = [
      { id: "a", stage: "new", createdAt: created, firstResponseAt: null },
      {
        id: "b",
        stage: "new",
        createdAt: created,
        firstResponseAt: new Date("2027-01-18T15:05:00Z"),
      },
      { id: "c", stage: "contacted", createdAt: created, firstResponseAt: null },
      { id: "d", stage: "new", createdAt: new Date("2027-01-18T15:25:00Z"), firstResponseAt: null },
    ];
    expect(slaBreaches(leads, now, hours, 15)).toEqual([
      { leadId: "a", minutes: 30, dedupeKey: "lead_sla:a" },
    ]);
  });
});

describe("weekKey", () => {
  it("devuelve el lunes de la semana", () => {
    expect(weekKey("2027-01-18")).toBe("2027-01-18");
    expect(weekKey("2027-01-24")).toBe("2027-01-18");
    expect(weekKey("2027-01-20")).toBe("2027-01-18");
  });
});

describe("iCal", () => {
  it("escapa caracteres especiales", () => {
    expect(icsEscape("Boda; 120 inv., nota\nfin\\")).toBe("Boda\\; 120 inv.\\, nota\\nfin\\\\");
  });

  it("pliega líneas largas a 75 octetos sin partir caracteres", () => {
    const line = `SUMMARY:${"á".repeat(60)}`;
    const folded = icsFold(line).split("\r\n");
    expect(folded.length).toBeGreaterThan(1);
    for (const l of folded) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe(line);
    expect(icsFold("corto")).toBe("corto");
  });

  it("genera eventos de día completo con fin exclusivo", () => {
    const ics = buildIcs("Oasis", [
      {
        uid: "b1@oasis",
        start: "2027-01-31",
        summary: "Boda · Confirmada",
        description: "120 invitados",
        url: "https://example.test/admin/reservas/b1",
        updatedAt: new Date("2026-10-18T12:00:00.000Z"),
      },
      {
        uid: "k1@oasis",
        start: "2027-02-01",
        end: "2027-02-03",
        summary: "Bloqueo",
        updatedAt: new Date(0),
      },
    ]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270131\r\nDTEND;VALUE=DATE:20270201");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270201\r\nDTEND;VALUE=DATE:20270204");
    expect(ics).toContain("DTSTAMP:20261018T120000Z");
    expect(ics).toContain("URL:https://example.test/admin/reservas/b1");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
