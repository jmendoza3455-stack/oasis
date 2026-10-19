// Atribución por pieza: cada Reel o carrusel lleva sus propios links cortos (/r/<código>).
// El link web llega a la consulta de fechas con utm_content = código; el de WhatsApp abre el chat
// con "(código pieza-<código>)", que el Recepcionista guarda como campaña del lead.

export const NETWORKS = ["instagram", "tiktok", "facebook", "google", "whatsapp", "otro"] as const;
export type Network = (typeof NETWORKS)[number];

const CODE_RE = /^[a-z0-9-]{2,40}$/;

export function normalizeCode(code: string): string | null {
  const c = decodeURIComponent(code).trim().toLowerCase();
  return CODE_RE.test(c) ? c : null;
}

/** Links para copiar en el caption, la historia o la bio. */
export function pieceLinks(siteUrl: string, code: string) {
  const base = `${siteUrl.replace(/\/$/, "")}/r/${code}`;
  return {
    instagram: `${base}?s=instagram`,
    tiktok: `${base}?s=tiktok`,
    facebook: `${base}?s=facebook`,
    whatsapp: `${base}?s=instagram&to=wa`,
  };
}

export function resolvePieceRedirect(input: {
  code: string;
  s?: string | null;
  to?: string | null;
  whatsappNumber?: string | null;
}): { url: string; code: string; network: Network; target: "web" | "whatsapp" } | null {
  const code = normalizeCode(input.code);
  if (!code) return null;
  const network: Network = (NETWORKS as readonly string[]).includes(input.s ?? "")
    ? (input.s as Network)
    : "otro";
  if (input.to === "wa" && input.whatsappNumber) {
    const text = `Hola, vi su publicación y quisiera información de Oasis Pachacámac (código pieza-${code})`;
    return {
      url: `https://wa.me/${input.whatsappNumber}?text=${encodeURIComponent(text)}`,
      code,
      network,
      target: "whatsapp",
    };
  }
  const params = new URLSearchParams({
    utm_source: network,
    utm_medium: "social",
    utm_campaign: "organico",
    utm_content: code,
  });
  return { url: `/?${params}#cotizar`, code, network, target: "web" };
}

/** Las vistas previas de links (Instagram, WhatsApp, buscadores) no son clics de personas. */
export function isBot(userAgent: string | null): boolean {
  return /bot|crawl|spider|preview|facebookexternalhit|whatsapp\/|slurp|embed|curl|wget/i.test(
    userAgent ?? "",
  );
}
