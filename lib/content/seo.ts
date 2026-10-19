export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** schema.org EventVenue + LocalBusiness. Datos no confirmados se omiten (no inventar). */
export function venueJsonLd(info?: {
  address: string | null;
  mapsUrl: string | null;
  social: Record<string, string | undefined>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": ["EventVenue", "LocalBusiness"],
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
    ...(info && Object.values(info.social).some(Boolean)
      ? { sameAs: Object.values(info.social).filter(Boolean) }
      : {}),
    parentOrganization: { "@type": "Organization", name: "SAWA – Gestión Comercial S.A.C." },
    amenityFeature: ["Piscina", "Jardín", "Terraza", "Zona de parrilla"].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };
}
