import { addDays, type ISODate } from "./calendar";
import { round2 } from "./money";
import type { BookingStatus } from "./booking";

export type CommissionInput = {
  status: BookingStatus;
  plannerId: string | null;
  /** Alquiler del espacio SIN IGV, después de descuentos. Excluye garantía y terceros. */
  rentalNet: number;
  rentalGross: number;
  /** Cobrado del alquiler con pagos validados. */
  paidValidated: number;
  /** Fecha en que el evento quedó realizado y cobrado al 100 % (la más tardía de ambas). */
  fullyPaidAndDoneOn: ISODate;
  rate: number;
  paymentDays: number;
};

export type Commission = { baseNet: number; rate: number; amount: number; payableOn: ISODate };

/**
 * Comisión del planner (OASIS.md §5.2): 5 % sobre el alquiler sin IGV, solo con el evento
 * realizado y cobrado al 100 %. Pagadera `paymentDays` después.
 */
export function computeCommission(input: CommissionInput): Commission | null {
  if (!input.plannerId) return null;
  if (input.status !== "done" && input.status !== "settled") return null;
  if (input.paidValidated < input.rentalGross) return null;
  if (!(input.rate >= 0 && input.rate <= 1)) throw new RangeError("commission_rate_out_of_range");

  const baseNet = round2(input.rentalNet);
  return {
    baseNet,
    rate: input.rate,
    amount: round2(baseNet * input.rate),
    payableOn: addDays(input.fullyPaidAndDoneOn, input.paymentDays),
  };
}

export type CommissionStatus = "accrued" | "payable" | "paid";

export function commissionStatus(
  c: { payableOn: ISODate; paidAt: string | null },
  today: ISODate,
): CommissionStatus {
  if (c.paidAt) return "paid";
  return today >= c.payableOn ? "payable" : "accrued";
}
