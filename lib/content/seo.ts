export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** schema.org EventVenue + LocalBusiness. Datos no confirmados se omiten (no inventar). */
export function venueJsonLd() {
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
      addressLocality: "Pachacámac",
      addressRegion: "Lima",
      addressCountry: "PE",
    },
    parentOrganization: { "@type": "Organization", name: "SAWA – Gestión Comercial S.A.C." },
    amenityFeature: ["Piscina", "Jardín", "Terraza", "Zona de parrilla"].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };
}
