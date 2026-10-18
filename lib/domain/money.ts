// Montos en soles con 2 decimales. Toda la lógica de dominio trabaja con números ya redondeados
// a céntimos para cuadrar exactamente con las columnas numeric(12,2) de la BD.

export type Amounts = { net: number; igv: number; gross: number };

/** Redondeo comercial a 2 decimales (half away from zero), igual que round() de Postgres. */
export function round2(value: number): number {
  const sign = value < 0 ? -1 : 1;
  // Notación exponencial para evitar el error binario (1.005 * 100 = 100.49999…)
  const rounded = Number(`${Math.round(Number(`${Math.abs(value).toFixed(10)}e2`))}e-2`);
  return sign * rounded || 0;
}

/** Desde un monto SIN IGV. Misma fórmula que las columnas generadas de bookings. */
export function fromNet(net: number, igvRate: number): Amounts {
  assertRate(igvRate);
  const n = round2(net);
  const igv = round2(n * igvRate);
  return { net: n, igv, gross: round2(n + igv) };
}

/** Desde un monto CON IGV (p. ej. precio publicado). El IGV absorbe la diferencia de redondeo. */
export function fromGross(gross: number, igvRate: number): Amounts {
  assertRate(igvRate);
  const g = round2(gross);
  const net = round2(g / (1 + igvRate));
  return { net, igv: round2(g - net), gross: g };
}

export function applyDiscount(amount: number, discountPct: number): number {
  if (discountPct < 0 || discountPct > 100) throw new RangeError("discount_pct_out_of_range");
  return round2(amount * (1 - discountPct / 100));
}

function assertRate(rate: number) {
  if (!(rate >= 0 && rate <= 1)) throw new RangeError("igv_rate_out_of_range");
}

const pen = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});
const usd = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** "S/ 1,500.00" */
export function formatPEN(amount: number): string {
  return pen.format(amount);
}

/** Conversión referencial a USD con el tipo de cambio de settings. */
export function formatUSD(amountPen: number, usdRate: number): string {
  if (!(usdRate > 0)) throw new RangeError("usd_rate_invalid");
  return usd.format(round2(amountPen / usdRate));
}
