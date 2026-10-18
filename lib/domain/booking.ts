// Máquina de estados de la reserva (OASIS.md §5.1). ESPEJO de public.transition_booking()
// en supabase/migrations/20261018000300_bookings.sql; un test verifica que ambas coincidan.

export type BookingStatus =
  "prebooked" | "reserved" | "confirmed" | "done" | "settled" | "cancelled" | "expired";

export type Role = "admin" | "ops" | "planner" | "system";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  prebooked: "Pre-reserva",
  reserved: "Separada",
  confirmed: "Confirmada",
  done: "Realizada",
  settled: "Liquidada",
  cancelled: "Cancelada",
  expired: "Vencida",
};

export const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  prebooked: ["reserved", "cancelled", "expired"],
  reserved: ["confirmed", "cancelled"],
  confirmed: ["done", "cancelled"],
  done: ["settled"],
  settled: [],
  cancelled: [],
  expired: [],
};

/** Estados que ocupan la fecha. */
export const ACTIVE_STATUSES: readonly BookingStatus[] = [
  "prebooked",
  "reserved",
  "confirmed",
  "done",
  "settled",
];

/** Estados que cuentan como día vendido para la ocupación (OASIS.md §4). */
export const SOLD_STATUSES: readonly BookingStatus[] = ["reserved", "confirmed", "done", "settled"];

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type TransitionContext = {
  role: Role;
  isOwnPlannerBooking?: boolean;
  now: Date;
  holdExpiresAt: Date | null;
  /** Fecha del evento ya ocurrió (en hora de Lima). */
  eventHasHappened: boolean;
  depositAmount: number;
  rentalGross: number;
  /** Cobrado del alquiler con pagos validados (sin garantía). */
  paidValidated: number;
  contractSigned: boolean;
  guaranteeResolved: boolean;
  hasPlanner: boolean;
  commissionPaid: boolean;
  reason?: string;
};

export type TransitionError =
  | "invalid_transition"
  | "forbidden"
  | "hold_not_expired"
  | "deposit_not_validated"
  | "contract_not_signed"
  | "balance_not_paid"
  | "event_not_yet_happened"
  | "guarantee_not_resolved"
  | "commission_not_paid"
  | "cancel_reason_required";

export const TRANSITION_ERROR_MESSAGE: Record<TransitionError, string> = {
  invalid_transition: "Ese cambio de estado no está permitido.",
  forbidden: "No tienes permiso para hacer este cambio.",
  hold_not_expired: "La pre-reserva todavía está vigente.",
  deposit_not_validated: "Falta validar el adelanto.",
  contract_not_signed: "Falta registrar el contrato firmado.",
  balance_not_paid: "Falta validar el pago del saldo.",
  event_not_yet_happened: "El evento todavía no se realiza.",
  guarantee_not_resolved: "Falta devolver o aplicar la garantía.",
  commission_not_paid: "Falta pagar la comisión del planner.",
  cancel_reason_required: "Indica el motivo de la cancelación.",
};

function allowedFor(role: Role, from: BookingStatus, to: BookingStatus, own: boolean): boolean {
  switch (role) {
    case "admin":
      return true;
    case "ops":
      return (
        (from === "prebooked" && to === "cancelled") || (from === "confirmed" && to === "done")
      );
    case "planner":
      return own && from === "prebooked" && to === "cancelled";
    case "system":
      return to === "expired";
  }
}

export function checkTransition(
  from: BookingStatus,
  to: BookingStatus,
  ctx: TransitionContext,
): { ok: true } | { ok: false; error: TransitionError } {
  const fail = (error: TransitionError) => ({ ok: false as const, error });
  if (!canTransition(from, to)) return fail("invalid_transition");
  if (!allowedFor(ctx.role, from, to, ctx.isOwnPlannerBooking ?? false)) return fail("forbidden");

  switch (to) {
    case "expired":
      if (ctx.holdExpiresAt && ctx.holdExpiresAt > ctx.now) return fail("hold_not_expired");
      break;
    case "reserved":
      if (ctx.paidValidated < ctx.depositAmount) return fail("deposit_not_validated");
      break;
    case "confirmed":
      if (!ctx.contractSigned) return fail("contract_not_signed");
      if (ctx.paidValidated < ctx.rentalGross) return fail("balance_not_paid");
      break;
    case "done":
      if (!ctx.eventHasHappened) return fail("event_not_yet_happened");
      break;
    case "settled":
      if (!ctx.guaranteeResolved) return fail("guarantee_not_resolved");
      if (ctx.hasPlanner && !ctx.commissionPaid) return fail("commission_not_paid");
      break;
    case "cancelled":
      if (!ctx.reason?.trim()) return fail("cancel_reason_required");
      break;
  }
  return { ok: true };
}

export type TransitionEffects = {
  releasesDate: boolean;
  /** El evento quedó realizado: si además está cobrado al 100 %, se devenga la comisión. */
  mayAccrueCommission: boolean;
  /** La garantía debe resolverse (devolver o aplicar) antes de liquidar. */
  startsGuaranteeSettlement: boolean;
};

export function effectsOf(to: BookingStatus): TransitionEffects {
  return {
    releasesDate: to === "cancelled" || to === "expired",
    mayAccrueCommission: to === "done",
    startsGuaranteeSettlement: to === "done",
  };
}

export type CancellationPolicy = {
  earlyCancelMinDays: number;
  earlyCancelRefundPct: number;
  lateCancelRefundPct: number;
};

/** Devolución por cancelación según anticipación (OASIS.md §5.4). Sobre el adelanto pagado. */
export function cancellationRefund(
  depositPaid: number,
  daysBeforeEvent: number,
  policy: CancellationPolicy,
): number {
  const pct =
    daysBeforeEvent > policy.earlyCancelMinDays
      ? policy.earlyCancelRefundPct
      : policy.lateCancelRefundPct;
  return Math.round(depositPaid * pct * 100) / 100;
}
