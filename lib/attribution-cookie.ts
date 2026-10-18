// Cookie de atribución first-touch escrita por el proxy en la primera visita con campaña.
// Garantiza que la UTM llegue a la BD aunque el visitante navegue antes de que cargue el JS.
export const ATTRIBUTION_COOKIE = "oasis_attr";
export const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;

export type AttributionCookie = Partial<
  Record<(typeof ATTRIBUTION_PARAMS)[number] | "landing_path" | "referrer", string>
>;

export function parseAttributionCookie(value: string | undefined): AttributionCookie {
  if (!value) return {};
  try {
    return JSON.parse(decodeURIComponent(value)) as AttributionCookie;
  } catch {
    return {};
  }
}
