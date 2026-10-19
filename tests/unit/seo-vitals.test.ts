import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, faqJsonLd, jsonLdString, venueJsonLd } from "@/lib/content/seo";
import { vitalEvent } from "@/lib/web-vitals";

const base = { address: null, mapsUrl: null, social: {} };

describe("datos estructurados (schema.org)", () => {
  it("sin datos configurados no inventa dirección, aforo, precios ni redes", () => {
    const j = venueJsonLd(base) as unknown as Record<string, unknown>;
    expect(j).toMatchObject({
      "@type": "LocalBusiness",
      additionalType: "https://schema.org/EventVenue",
      name: "Oasis Pachacámac",
      address: { addressLocality: "Pachacámac", addressCountry: "PE" },
    });
    for (const k of ["hasMap", "sameAs", "maximumAttendeeCapacity", "priceRange"])
      expect(j).not.toHaveProperty(k);
    expect(j.address).not.toHaveProperty("streetAddress");
    expect(JSON.stringify(j)).not.toMatch(/SAWA|COMPLETAR/);
  });

  it("usa los datos de Configuración y muestra precios solo si son públicos", () => {
    const info = {
      address: "Calle Ficticia 123",
      mapsUrl: "https://maps.example/x",
      social: { instagram: "https://instagram.com/x", tiktok: "" },
      capacity: { cocktail: 150, banquet: 100, full_day: null },
      rates: [{ gross: 2950 }, { gross: 6136 }, { gross: 1416 }],
    };
    expect(venueJsonLd({ ...info, pricesEnabled: false })).not.toHaveProperty("priceRange");
    const j = venueJsonLd({ ...info, pricesEnabled: true });
    expect(j).toMatchObject({
      hasMap: "https://maps.example/x",
      sameAs: ["https://instagram.com/x"],
      maximumAttendeeCapacity: 150,
      address: { streetAddress: "Calle Ficticia 123" },
    });
    expect((j as { priceRange: string }).priceRange).toMatch(/^S\/\s?1,416\.00 – S\/\s?6,136\.00$/);
  });

  it("preguntas frecuentes y migas de pan", () => {
    const faq = faqJsonLd([{ q: "¿Hay piscina?", a: "Sí." }]);
    expect(faq.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "¿Hay piscina?",
        acceptedAnswer: { "@type": "Answer", text: "Sí." },
      },
    ]);
    const bc = breadcrumbJsonLd([
      { name: "Inicio", path: "/" },
      { name: "Bodas", path: "/bodas" },
    ]);
    expect(bc.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Inicio", item: expect.not.stringMatching(/\/$/) },
      { "@type": "ListItem", position: 2, name: "Bodas", item: expect.stringMatching(/\/bodas$/) },
    ]);
  });

  it("un texto con </script> no rompe la página", () => {
    const s = jsonLdString(faqJsonLd([{ q: "x</script><script>alert(1)", a: "y" }]));
    expect(s).not.toContain("</script>");
    expect(JSON.parse(s).mainEntity[0].name).toBe("x</script><script>alert(1)");
  });
});

describe("velocidad real (Core Web Vitals)", () => {
  it("convierte cada métrica en un evento de GA4 y descarta las internas de Next", () => {
    expect(
      vitalEvent({ name: "CLS", id: "v1", value: 0.05, delta: 0.012, rating: "good" }),
    ).toEqual({
      name: "CLS",
      params: {
        value: 12,
        metric_id: "v1",
        metric_value: 0.05,
        metric_delta: 0.012,
        metric_rating: "good",
        navigation_type: "unknown",
        non_interaction: true,
      },
    });
    expect(vitalEvent({ name: "INP", id: "v2", value: 180.4, delta: 180.4 })?.params.value).toBe(
      180,
    );
    expect(vitalEvent({ name: "Next.js-hydration", id: "v3", value: 10, delta: 10 })).toBeNull();
  });
});
