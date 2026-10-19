// Estadística del equipo de marketing: pruebas de gancho y calibración del director creativo.
// Puras y sin dependencias para poder probarlas y usarlas en la página y en los agentes.

/** Φ(x) normal estándar (Abramowitz y Stegun 7.1.26, error < 1.5e-7). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(x) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export type Arm = { n: number; successes: number };
export type AbResult = {
  rateA: number | null;
  rateB: number | null;
  /** Probabilidad (bayesiana, prior uniforme) de que B supere a A. */
  pBBeatsA: number | null;
  verdict: "B gana" | "A gana" | "sin diferencia clara" | "falta muestra";
};

/** Reglas por defecto: ≥ 1,000 por variante y 90 % de probabilidad (docs/261019 Laboratorio de marketing.md). */
export const AB_RULES = { minN: 1000, threshold: 0.9 } as const;

/**
 * P(p_B > p_A) con posteriores Beta(1 + éxitos, 1 + fracasos). Con muestras de cientos o miles la
 * aproximación normal de las Beta es exacta a efectos prácticos.
 */
export function abTest(
  a: Arm,
  b: Arm,
  rules: { minN: number; threshold: number } = AB_RULES,
): AbResult {
  const post = (x: Arm) => {
    const al = 1 + x.successes;
    const be = 1 + x.n - x.successes;
    const mean = al / (al + be);
    return { mean, var: (al * be) / ((al + be) ** 2 * (al + be + 1)) };
  };
  const rate = (x: Arm) => (x.n > 0 ? x.successes / x.n : null);
  if (a.n <= 0 || b.n <= 0)
    return { rateA: rate(a), rateB: rate(b), pBBeatsA: null, verdict: "falta muestra" };
  const pa = post(a);
  const pb = post(b);
  const p = normalCdf((pb.mean - pa.mean) / Math.sqrt(pa.var + pb.var));
  const enough = a.n >= rules.minN && b.n >= rules.minN;
  return {
    rateA: rate(a),
    rateB: rate(b),
    pBBeatsA: p,
    verdict: !enough
      ? "falta muestra"
      : p >= rules.threshold
        ? "B gana"
        : p <= 1 - rules.threshold
          ? "A gana"
          : "sin diferencia clara",
  };
}

/** Rangos promedio (empates comparten rango). */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
  const r = new Array<number>(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

/** Correlación de Spearman (null si hay menos de 3 pares o sin variación). */
export function spearman(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const rx = ranks(x);
  const ry = ranks(y);
  const mean = (v: number[]) => v.reduce((s, n) => s + n, 0) / v.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
}

/**
 * AUC (Mann–Whitney): probabilidad de que una pieza aprobada tenga mayor puntaje que una
 * rechazada. 0.5 = el puntaje no predice nada; 1 = predice perfecto. Null sin ambos casos.
 */
export function auc(scores: number[], approved: boolean[]): number | null {
  const pos = scores.filter((_, i) => approved[i]);
  const neg = scores.filter((_, i) => !approved[i]);
  if (!pos.length || !neg.length) return null;
  let wins = 0;
  for (const p of pos) for (const q of neg) wins += p > q ? 1 : p === q ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

export type Calibration = {
  decided: number;
  /** % de lo que aprueba el director que André aprueba a la primera. */
  precision: number | null;
  auc: number | null;
  /** Correlación del puntaje con el rendimiento real (guardados+compartidos por 1,000). */
  scoreVsPerformance: number | null;
  measured: number;
  /** Qué falta para poder concluir. */
  pending: string[];
};

export const CALIBRATION_RULES = { minDecided: 20, minMeasured: 30 } as const;

export function calibration(
  pieces: { score: number | null; firstDecision: string | null; perf: number | null }[],
): Calibration {
  const decided = pieces.filter((p) => p.score !== null && p.firstDecision !== null);
  const approved = decided.map((p) => p.firstDecision === "approved");
  const measured = pieces.filter((p) => p.score !== null && p.perf !== null);
  const pending: string[] = [];
  if (decided.length < CALIBRATION_RULES.minDecided)
    pending.push(`faltan ${CALIBRATION_RULES.minDecided - decided.length} decisiones para el AUC`);
  if (measured.length < CALIBRATION_RULES.minMeasured)
    pending.push(
      `faltan ${CALIBRATION_RULES.minMeasured - measured.length} piezas medidas para la correlación`,
    );
  return {
    decided: decided.length,
    precision: decided.length ? approved.filter(Boolean).length / decided.length : null,
    auc:
      decided.length >= CALIBRATION_RULES.minDecided
        ? auc(
            decided.map((p) => p.score!),
            approved,
          )
        : null,
    scoreVsPerformance:
      measured.length >= CALIBRATION_RULES.minMeasured
        ? spearman(
            measured.map((p) => p.score!),
            measured.map((p) => p.perf!),
          )
        : null,
    measured: measured.length,
    pending,
  };
}

// ---------------------------------------------------------------------------
// Lectura de las métricas que André copia de cada red (marketing_pieces.metrics)
// ---------------------------------------------------------------------------
type Metrics = Record<string, unknown>;
const num = (m: Metrics, k: string) =>
  typeof m[k] === "number" && Number.isFinite(m[k]) ? (m[k] as number) : null;

/** Guardados + compartidos por cada 1,000 de alcance (la señal de intención de la marca). */
export function performance(m: Metrics): number | null {
  const reach = num(m, "reach");
  if (!reach) return null;
  return (1000 * ((num(m, "saves") ?? 0) + (num(m, "shares") ?? 0))) / reach;
}

/** Reproducciones que pasaron los 3 primeros segundos (n = reproducciones o alcance). */
export function retainedArm(m: Metrics): Arm | null {
  const n = num(m, "views") ?? num(m, "reach");
  const skip = num(m, "skip_rate");
  if (!n || skip === null) return null;
  return { n, successes: Math.round(n * (1 - skip / 100)) };
}

export type HookTest = { a: string; b: string; result: AbResult };

/**
 * Pruebas de gancho: la variante B lleva el código de A con "b" al final (r07 vs r07b), mismo
 * cuerpo y otro gancho. Gana el gancho que retiene más los 3 primeros segundos.
 */
export function hookTests(pieces: { code: string; metrics: Metrics }[]): HookTest[] {
  const byCode = new Map(pieces.map((p) => [p.code, p.metrics]));
  const tests: HookTest[] = [];
  for (const p of pieces) {
    if (!p.code.endsWith("b") || !byCode.has(p.code.slice(0, -1))) continue;
    const a = retainedArm(byCode.get(p.code.slice(0, -1))!);
    const b = retainedArm(p.metrics);
    tests.push({
      a: p.code.slice(0, -1),
      b: p.code,
      result:
        a && b
          ? abTest(a, b)
          : { rateA: null, rateB: null, pBBeatsA: null, verdict: "falta muestra" },
    });
  }
  return tests.sort((x, y) => x.a.localeCompare(y.a));
}
