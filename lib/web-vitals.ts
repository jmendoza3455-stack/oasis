// Velocidad real de los visitantes (Core Web Vitals) hacia GA4, en el formato recomendado por
// Google: un evento por métrica con el delta como valor (CLS × 1000) y el id para agrupar.

export const REPORTED = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;

export type VitalMetric = {
  name: string;
  id: string;
  value: number;
  delta: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
};

export function vitalEvent(m: VitalMetric) {
  if (!(REPORTED as readonly string[]).includes(m.name)) return null;
  return {
    name: m.name,
    params: {
      value: Math.round(m.name === "CLS" ? m.delta * 1000 : m.delta),
      metric_id: m.id,
      metric_value: m.value,
      metric_delta: m.delta,
      metric_rating: m.rating ?? "unknown",
      navigation_type: m.navigationType ?? "unknown",
      non_interaction: true,
    },
  };
}
