import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  cancellationRefund,
  checkReschedule,
  canTransition,
  checkTransition,
  effectsOf,
  STATUS_LABEL,
  TRANSITION_ERROR_MESSAGE,
  TRANSITIONS,
  type BookingStatus,
  type TransitionContext,
} from "@/lib/domain";

const now = new Date("2026-12-01T12:00:00Z");
const ctx = (over: Partial<TransitionContext> = {}): TransitionContext => ({
  role: "admin",
  now,
  holdExpiresAt: new Date("2026-12-02T12:00:00Z"),
  eventHasHappened: false,
  depositAmount: 2950,
  rentalGross: 5900,
  paidValidated: 0,
  contractSigned: false,
  guaranteeResolved: false,
  hasPlanner: false,
  commissionPaid: false,
  ...over,
});

describe("máquina de estados", () => {
  it("es espejo exacto de public.booking_transition_allowed() en la BD", () => {
    const sql = readFileSync(
      path.resolve(__dirname, "../../../supabase/migrations/20261018000300_bookings.sql"),
      "utf8",
    );
    const body = sql.split("function public.booking_transition_allowed")[1].split("$$;")[0];
    const pairs = [...body.matchAll(/\('(\w+)'(?:::public\.booking_status)?,\s*'(\w+)'/g)].map(
      (m) => `${m[1]}->${m[2]}`,
    );
    const ts = Object.entries(TRANSITIONS).flatMap(([from, tos]) =>
      tos.map((to) => `${from}->${to}`),
    );
    expect(new Set(pairs)).toEqual(new Set(ts));
    expect(pairs).toHaveLength(ts.length);
  });

  it("rechaza transiciones inválidas", () => {
    expect(canTransition("prebooked", "done")).toBe(false);
    expect(checkTransition("settled", "cancelled", ctx())).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("permisos por rol", () => {
    expect(checkTransition("prebooked", "cancelled", ctx({ role: "ops", reason: "x" })).ok).toBe(
      true,
    );
    expect(
      checkTransition("prebooked", "reserved", ctx({ role: "ops", paidValidated: 2950 })),
    ).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(
      checkTransition("confirmed", "done", ctx({ role: "ops", eventHasHappened: true })).ok,
    ).toBe(true);
    expect(
      checkTransition("prebooked", "cancelled", ctx({ role: "planner", reason: "x" })).ok,
    ).toBe(false);
    expect(
      checkTransition(
        "prebooked",
        "cancelled",
        ctx({ role: "planner", reason: "x", isOwnPlannerBooking: true }),
      ).ok,
    ).toBe(true);
    expect(
      checkTransition("prebooked", "reserved", ctx({ role: "system", paidValidated: 9999 })).ok,
    ).toBe(false);
    expect(
      checkTransition(
        "prebooked",
        "expired",
        ctx({ role: "system", holdExpiresAt: new Date("2026-11-30") }),
      ).ok,
    ).toBe(true);
  });

  it("guardas de negocio", () => {
    expect(checkTransition("prebooked", "expired", ctx({ role: "system" }))).toEqual({
      ok: false,
      error: "hold_not_expired",
    });
    expect(checkTransition("prebooked", "reserved", ctx())).toEqual({
      ok: false,
      error: "deposit_not_validated",
    });
    expect(checkTransition("prebooked", "reserved", ctx({ paidValidated: 2950 })).ok).toBe(true);
    expect(checkTransition("reserved", "confirmed", ctx({ paidValidated: 5900 }))).toEqual({
      ok: false,
      error: "contract_not_signed",
    });
    expect(
      checkTransition("reserved", "confirmed", ctx({ contractSigned: true, paidValidated: 3000 })),
    ).toEqual({
      ok: false,
      error: "balance_not_paid",
    });
    expect(
      checkTransition("reserved", "confirmed", ctx({ contractSigned: true, paidValidated: 5900 }))
        .ok,
    ).toBe(true);
    expect(checkTransition("confirmed", "done", ctx())).toEqual({
      ok: false,
      error: "event_not_yet_happened",
    });
    expect(checkTransition("done", "settled", ctx())).toEqual({
      ok: false,
      error: "guarantee_not_resolved",
    });
    expect(
      checkTransition("done", "settled", ctx({ guaranteeResolved: true, hasPlanner: true })),
    ).toEqual({
      ok: false,
      error: "commission_not_paid",
    });
    expect(
      checkTransition(
        "done",
        "settled",
        ctx({ guaranteeResolved: true, hasPlanner: true, commissionPaid: true }),
      ).ok,
    ).toBe(true);
    expect(checkTransition("reserved", "cancelled", ctx({ reason: "  " }))).toEqual({
      ok: false,
      error: "cancel_reason_required",
    });
  });

  it("efectos de cada transición", () => {
    expect(effectsOf("cancelled").releasesDate).toBe(true);
    expect(effectsOf("expired").releasesDate).toBe(true);
    expect(effectsOf("done")).toEqual({
      releasesDate: false,
      mayAccrueCommission: true,
      startsGuaranteeSettlement: true,
    });
    expect(effectsOf("reserved").mayAccrueCommission).toBe(false);
  });

  it("todos los estados y errores tienen texto en español", () => {
    for (const s of Object.keys(TRANSITIONS) as BookingStatus[])
      expect(STATUS_LABEL[s]).toBeTruthy();
    expect(Object.values(TRANSITION_ERROR_MESSAGE).every((m) => m.endsWith("."))).toBe(true);
  });

  it("devolución por cancelación según anticipación", () => {
    const policy = { earlyCancelMinDays: 60, earlyCancelRefundPct: 0.5, lateCancelRefundPct: 0 };
    expect(cancellationRefund(2950, 75, policy)).toBe(1475);
    expect(cancellationRefund(2950, 60, policy)).toBe(0);
    expect(cancellationRefund(2950, 10, policy)).toBe(0);
  });
});

describe("checkReschedule (espejo de reschedule_booking)", () => {
  const base = {
    status: "reserved" as const,
    eventDate: "2027-03-20",
    newDate: "2027-04-17",
    today: "2027-01-10",
    reschedulesUsed: 0,
    isAdmin: false,
    policy: { freeMinDays: 30, allowed: 1 },
  };
  it("operaciones reprograma dentro de la política", () => {
    expect(checkReschedule(base)).toEqual({ ok: true });
    expect(checkReschedule({ ...base, status: "confirmed" })).toEqual({ ok: true });
  });
  it("rechaza estados, fechas pasadas o iguales", () => {
    expect(checkReschedule({ ...base, status: "prebooked" })).toEqual({
      ok: false,
      error: "reschedule_invalid_status",
    });
    expect(checkReschedule({ ...base, newDate: "2027-01-10" })).toEqual({
      ok: false,
      error: "reschedule_date_in_past",
    });
    expect(checkReschedule({ ...base, newDate: base.eventDate })).toEqual({
      ok: false,
      error: "reschedule_same_date",
    });
  });
  it("fuera de la política solo el admin", () => {
    expect(checkReschedule({ ...base, reschedulesUsed: 1 })).toEqual({
      ok: false,
      error: "reschedule_limit_reached",
    });
    expect(checkReschedule({ ...base, today: "2027-03-01" })).toEqual({
      ok: false,
      error: "reschedule_late_requires_admin",
    });
    expect(
      checkReschedule({ ...base, reschedulesUsed: 1, today: "2027-03-01", isAdmin: true }),
    ).toEqual({ ok: true });
  });
});
