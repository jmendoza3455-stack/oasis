"use client";

import { useReportWebVitals } from "next/web-vitals";
import { vitalEvent } from "@/lib/web-vitals";

type Win = Window & { gtag?: (...args: unknown[]) => void };

// Referencia estable: el hook vuelve a registrar el reporte si la función cambia
const report: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  const event = vitalEvent(metric);
  // gtag solo existe si el visitante aceptó las cookies de medición (<Analytics />)
  if (event) (window as Win).gtag?.("event", event.name, event.params);
};

/** Velocidad real de la web pública (LCP, INP, CLS, FCP, TTFB) hacia GA4. */
export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
