import { describe, expect, it } from "vitest";
import {
  abTest,
  auc,
  calibration,
  hookTests,
  normalCdf,
  performance,
  retainedArm,
  spearman,
} from "@/lib/marketing/stats";

describe("prueba de ganchos (bayesiana)", () => {
  it("Φ coincide con valores de tabla", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.2816)).toBeCloseTo(0.1, 3);
  });

  it("decide solo con muestra suficiente y diferencia clara", () => {
    expect(abTest({ n: 2000, successes: 600 }, { n: 2000, successes: 700 }).verdict).toBe("B gana");
    expect(abTest({ n: 2000, successes: 700 }, { n: 2000, successes: 600 }).verdict).toBe("A gana");
    const tie = abTest({ n: 2000, successes: 600 }, { n: 2000, successes: 610 });
    expect(tie.verdict).toBe("sin diferencia clara");
    expect(tie.pBBeatsA!).toBeGreaterThan(0.5);
    // Misma diferencia relativa pero sin muestra: no se concluye
    expect(abTest({ n: 300, successes: 90 }, { n: 300, successes: 105 }).verdict).toBe(
      "falta muestra",
    );
    expect(abTest({ n: 0, successes: 0 }, { n: 10, successes: 5 }).pBBeatsA).toBeNull();
  });

  it("la probabilidad es simétrica", () => {
    const ab = abTest({ n: 1500, successes: 450 }, { n: 1500, successes: 480 }).pBBeatsA!;
    const ba = abTest({ n: 1500, successes: 480 }, { n: 1500, successes: 450 }).pBBeatsA!;
    expect(ab + ba).toBeCloseTo(1, 6);
  });
});

describe("calibración del director creativo", () => {
  it("Spearman y AUC con casos conocidos", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 2, 2, 3], [1, 2, 3, 4])).toBeCloseTo(0.9487, 3);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(auc([90, 85, 70, 60], [true, true, false, false])).toBe(1);
    expect(auc([80, 80], [true, false])).toBe(0.5);
    expect(auc([90], [true])).toBeNull();
  });

  it("informa lo que falta antes de concluir", () => {
    const few = calibration([
      { score: 85, firstDecision: "approved", perf: 12 },
      { score: 82, firstDecision: "changes", perf: null },
    ]);
    expect(few).toMatchObject({ decided: 2, precision: 0.5, auc: null, scoreVsPerformance: null });
    expect(few.pending).toEqual([
      "faltan 18 decisiones para el AUC",
      "faltan 29 piezas medidas para la correlación",
    ]);
    const many = calibration(
      Array.from({ length: 30 }, (_, i) => ({
        score: 80 + (i % 20),
        firstDecision: i % 20 >= 10 ? "approved" : "changes",
        perf: i % 20,
      })),
    );
    expect(many.auc).toBe(1);
    expect(many.scoreVsPerformance).toBeCloseTo(1);
    expect(many.pending).toEqual([]);
  });
});

describe("métricas copiadas de las redes", () => {
  it("rendimiento = guardados + compartidos por 1,000 de alcance", () => {
    expect(performance({ reach: 2000, saves: 30, shares: 10 })).toBe(20);
    expect(performance({ reach: 0, saves: 3 })).toBeNull();
    expect(performance({ saves: 3, measured_at: "2026-10-19" })).toBeNull();
  });

  it("la retención de 3 s sale de reproducciones y tasa de salto", () => {
    expect(retainedArm({ views: 1500, skip_rate: 40 })).toEqual({ n: 1500, successes: 900 });
    expect(retainedArm({ reach: 1000, skip_rate: 12.5 })).toEqual({ n: 1000, successes: 875 });
    expect(retainedArm({ views: 1500 })).toBeNull();
  });

  it("empareja r07 con r07b y solo concluye con datos de ambas", () => {
    const tests = hookTests([
      { code: "r07", metrics: { views: 3000, skip_rate: 45 } },
      { code: "r07b", metrics: { views: 3000, skip_rate: 35 } },
      { code: "c03b", metrics: { views: 900, skip_rate: 20 } }, // sin A: no es prueba
      { code: "r09", metrics: { views: 2000, skip_rate: 30 } },
      { code: "r09b", metrics: { views: 2000 } },
    ]);
    expect(tests.map((t) => [t.a, t.b, t.result.verdict])).toEqual([
      ["r07", "r07b", "B gana"],
      ["r09", "r09b", "falta muestra"],
    ]);
  });
});
