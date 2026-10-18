import { describe, expect, it } from "vitest";
import {
  commissionStatus,
  computeCommission,
  findProtectedMatch,
  normalizeEmail,
  normalizePhone,
  normalizeRuc,
  protectedUntil,
  type CommissionInput,
  type PlannerRegistration,
} from "@/lib/domain";

const input = (over: Partial<CommissionInput> = {}): CommissionInput => ({
  status: "done",
  plannerId: "p1",
  rentalNet: 4500,
  rentalGross: 5310,
  paidValidated: 5310,
  fullyPaidAndDoneOn: "2027-01-16",
  rate: 0.05,
  paymentDays: 7,
  ...over,
});

describe("comisión del planner", () => {
  it("5 % sobre el alquiler sin IGV, pagadera a los 7 días", () => {
    expect(computeCommission(input())).toEqual({
      baseNet: 4500,
      rate: 0.05,
      amount: 225,
      payableOn: "2027-01-23",
    });
  });

  it("solo con evento realizado y cobrado al 100 %", () => {
    expect(computeCommission(input({ status: "confirmed" }))).toBeNull();
    expect(computeCommission(input({ paidValidated: 5000 }))).toBeNull();
    expect(computeCommission(input({ plannerId: null }))).toBeNull();
    expect(computeCommission(input({ status: "settled" }))?.amount).toBe(225);
  });

  it("valida la tasa", () => {
    expect(() => computeCommission(input({ rate: 5 }))).toThrow("commission_rate_out_of_range");
  });

  it("estados devengada / por pagar / pagada", () => {
    expect(commissionStatus({ payableOn: "2027-01-23", paidAt: null }, "2027-01-20")).toBe(
      "accrued",
    );
    expect(commissionStatus({ payableOn: "2027-01-23", paidAt: null }, "2027-01-23")).toBe(
      "payable",
    );
    expect(
      commissionStatus({ payableOn: "2027-01-23", paidAt: "2027-01-24T10:00:00Z" }, "2027-01-30"),
    ).toBe("paid");
  });
});

describe("atribución del planner (90 días)", () => {
  const regs: PlannerRegistration[] = [
    {
      plannerId: "pA",
      clientId: "c1",
      phone: "+51 988 000 111",
      email: "novios@mail.pe",
      registeredOn: "2026-11-01",
    },
    { plannerId: "pB", clientId: "c2", phone: "988000111", registeredOn: "2026-11-20" },
    { plannerId: "pC", clientId: "c3", ruc: "20123456789", registeredOn: "2026-06-01" },
  ];

  it("normaliza contactos", () => {
    expect(normalizePhone("+51 988-000-111")).toBe("988000111");
    expect(normalizePhone("0051988000111")).toBe("988000111");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizeEmail("  Novios@Mail.PE ")).toBe("novios@mail.pe");
    expect(normalizeEmail("sin-arroba")).toBeNull();
    expect(normalizeRuc("20-123456789")).toBe("20123456789");
    expect(normalizeRuc("30123456789")).toBeNull();
  });

  it("respeta al primer planner que registró al cliente", () => {
    const m = findProtectedMatch({ phone: "988 000 111" }, regs, "2026-12-01", 90);
    expect(m).toEqual({
      plannerId: "pA",
      clientId: "c1",
      matchedOn: ["phone"],
      protectedUntil: "2027-01-30",
    });
  });

  it("matchea por correo o RUC", () => {
    expect(
      findProtectedMatch({ email: "NOVIOS@mail.pe" }, regs, "2026-12-01", 90)?.matchedOn,
    ).toEqual(["email"]);
    expect(findProtectedMatch({ ruc: "20123456789" }, regs, "2026-08-01", 90)?.plannerId).toBe(
      "pC",
    );
  });

  it("vencida la protección, el lead es directo", () => {
    expect(findProtectedMatch({ ruc: "20123456789" }, regs, "2026-12-01", 90)).toBeNull();
    const later = findProtectedMatch({ phone: "988000111" }, regs, "2027-02-10", 90);
    expect(later?.plannerId).toBe("pB");
  });

  it("sin datos de contacto no hay match", () => {
    expect(findProtectedMatch({ phone: "", email: null }, regs, "2026-12-01", 90)).toBeNull();
    expect(findProtectedMatch({ phone: "977 555 444" }, regs, "2026-12-01", 90)).toBeNull();
  });

  it("calcula la fecha de fin de protección", () => {
    expect(protectedUntil("2026-12-17", 90)).toBe("2027-03-17");
  });
});
