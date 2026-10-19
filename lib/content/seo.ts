import type { BreadcrumbList, FAQPage, LocalBusiness, Thing, WithContext } from "schema-dts";
import { formatPEN } from "@/lib/domain/money";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type VenueSeoInfo = {
  address: string | null;
  mapsUrl: string | null;
  social: Record<string, string | undefined>;
  capacity?: { cocktail: number | null; banquet: number | null; full_day: number | null };
  pricesEnabled?: boolean;
  rates?: { gross: number }[];
};

/**
 * schema.org del local (tipado con schema-dts). LocalBusiness para la ficha local de Google, con
 * EventVenue como tipo adicional. Datos no configurados se omiten (no inventar).
 */
export function venueJsonLd(info?: VenueSeoInfo): WithContext<LocalBusiness> {
  const caps = Object.values(info?.capacity ?? {}).filter((c): c is number => Boolean(c));
  const prices = info?.pricesEnabled ? (info.rates ?? []).map((r) => r.gross) : [];
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const social = Object.values(info?.social ?? {}).filter((s): s is string => Boolean(s));
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    additionalType: "https://schema.org/EventVenue",
    "@id": `${SITE_URL}/#local`,
    name: "Oasis Pachacámac",
    description:
      "Casa de campo para bodas, eventos corporativos y full days con piscina en Pachacámac, Lima.",
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    address: {
      "@type": "PostalAddress",
      ...(info?.address ? { streetAddress: info.address } : {}),
      addressLocality: "Pachacámac",
      addressRegion: "Lima",
      addressCountry: "PE",
    },
    ...(info?.mapsUrl ? { hasMap: info.mapsUrl } : {}),
    ...(social.length ? { sameAs: social } : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    ...(caps.length ? { maximumAttendeeCapacity: Math.max(...caps) } : {}),
    ...(prices.length
      ? { priceRange: `${formatPEN(Math.min(...prices))} – ${formatPEN(Math.max(...prices))}` }
      : {}),
    amenityFeature: ["Piscina", "Jardín", "Terraza", "Zona de parrilla"].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };
}

export function faqJsonLd(items: readonly { q: string; a: string }[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

export function breadcrumbJsonLd(
  items: readonly { name: string; path: string }[],
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((i, n) => ({
      "@type": "ListItem",
      position: n + 1,
      name: i.name,
      item: `${SITE_URL}${i.path === "/" ? "" : i.path}`,
    })),
  };
}

/** JSON seguro para <script type="application/ld+json"> (un "</script>" en un texto no lo cierra). */
export function jsonLdString(data: WithContext<Thing>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
