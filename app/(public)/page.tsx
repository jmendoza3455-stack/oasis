import type { Metadata } from "next";
import Link from "next/link";
import { Isotipo } from "@/components/brand/logo";
import { AvailabilityChecker } from "@/components/public/availability-checker";
import {
  Faq,
  Promise,
  QuoteAndLead,
  Section,
  SegmentCards,
  Spaces,
  TestimonialsPlaceholder,
} from "@/components/public/sections";
import { venueJsonLd } from "@/lib/content/seo";

export const metadata: Metadata = {
  title: { absolute: "Oasis Pachacámac · Casa de campo para eventos en Pachacámac" },
  description:
    "Bodas, eventos corporativos y full days con piscina en una casa de campo exclusiva en Pachacámac, Lima. Consulta disponibilidad y cotiza en línea.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueJsonLd()) }}
      />
      <section className="bg-brand-green text-brand-sand">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <Isotipo tone="light" className="size-14" />
            <h1 className="font-display mt-6 text-4xl leading-tight sm:text-5xl">
              Casa de campo para celebrar en Pachacámac
            </h1>
            <p className="text-brand-sand/85 mt-4 max-w-prose text-lg">
              Bodas, eventos de empresa y full days con piscina, en un espacio exclusivo y bien
              gestionado. Un espacio <strong>sawa</strong>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#cotizar"
                className="bg-brand-camel rounded-md px-5 py-3 font-medium text-[#2a2418] hover:opacity-90"
              >
                Cotizar mi evento
              </Link>
              <Link
                href="/planners"
                className="border-brand-sand/50 rounded-md border px-5 py-3 hover:bg-white/10"
              >
                Soy planner
              </Link>
            </div>
          </div>
          <div id="disponibilidad" className="bg-card text-foreground rounded-xl p-5 shadow-lg">
            <h2 className="font-display mb-3 text-2xl">Consulta disponibilidad</h2>
            <AvailabilityChecker />
          </div>
        </div>
      </section>

      <Section title="Un espacio con personalidad, a tu manera">
        <Promise />
      </Section>
      <Section title="¿Qué quieres celebrar?" className="pt-0">
        <SegmentCards />
      </Section>
      <Section
        title="Los espacios"
        lead="Fotos del local en preparación: el Oasis está en remodelación para su reapertura."
        className="pt-0"
      >
        <Spaces />
      </Section>
      <Section
        id="cotizar"
        title="Cotiza en minutos"
        lead="Elige tipo de evento, fecha e invitados y te mostramos un rango referencial."
      >
        <QuoteAndLead form="home" />
      </Section>
      <Section title="Lo que dicen nuestros clientes" className="pt-0">
        <TestimonialsPlaceholder />
      </Section>
      <Section title="Preguntas frecuentes" className="pt-0">
        <Faq />
      </Section>
      <Section title="Ubicación" className="pt-0">
        <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
          Pachacámac, Lima. Mapa y dirección exacta: <strong>pendiente</strong>.
        </div>
      </Section>
    </>
  );
}
