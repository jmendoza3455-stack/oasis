"use client";

import { writeStored } from "@/lib/use-stored";

// Eventos de conversión (OASIS.md §6.1). Solo se envían si el visitante aceptó cookies de
// medición y si los IDs están configurados (los scripts se cargan en <Analytics />).
export type TrackEvent = "lead_submit" | "whatsapp_click" | "availability_check" | "quote_view";

type Win = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
};

const META_EVENT: Record<TrackEvent, string> = {
  lead_submit: "Lead",
  whatsapp_click: "Contact",
  availability_check: "Search",
  quote_view: "ViewContent",
};

export function track(event: TrackEvent, params: Record<string, string | number | undefined> = {}) {
  const w = window as Win;
  w.gtag?.("event", event, params);
  w.fbq?.("track", META_EVENT[event], params);
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL;
  if (event === "lead_submit" && adsId && label)
    w.gtag?.("event", "conversion", { send_to: `${adsId}/${label}` });
}

// ---------------------------------------------------------------------------
// Atribución first-touch: UTM, gclid, fbclid, landing y referrer
// ---------------------------------------------------------------------------
export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;
export type Attribution = Partial<
  Record<(typeof ATTRIBUTION_KEYS)[number] | "landing_path" | "referrer", string>
>;

export const ATTRIBUTION_STORAGE_KEY = "oasis_attribution";
const STORAGE_KEY = ATTRIBUTION_STORAGE_KEY;

export function captureAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const fromUrl: Attribution = {};
  for (const k of ATTRIBUTION_KEYS) {
    const v = params.get(k);
    if (v) fromUrl[k] = v.slice(0, 300);
  }
  const stored = readAttribution();
  // Una campaña nueva en la URL reemplaza a la anterior; si no hay, se conserva la primera visita
  const next: Attribution = Object.keys(fromUrl).length
    ? {
        ...fromUrl,
        landing_path: window.location.pathname,
        referrer: document.referrer.slice(0, 500),
      }
    : (stored ?? {
        landing_path: window.location.pathname,
        referrer: document.referrer.slice(0, 500),
      });
  writeStored(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function readAttribution(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

export function parseAttribution(raw: string | null | undefined): Attribution {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Attribution;
  } catch {
    return {};
  }
}
