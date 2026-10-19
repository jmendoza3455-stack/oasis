import type { Metadata } from "next";
import Link from "next/link";
import { BrandArt } from "@/components/public/brand-art";
import { QuoteFlow } from "@/components/public/quote-flow";
import {
  CtaBand,
  Faq,
  HeroFacts,
  HowItWorks,
  Location,
  PolicyStrip,
  Promise,
  ReopeningBadge,
  Section,
  SegmentCards,
  Spaces,
} from "@/components/public/sections";
import { separateFaq } from "@/lib/content/faq";
import { venueJsonLd } from "@/lib/content/seo";
import { FAQ } from "@/lib/content/segments";
import { venueInfo } from "@/server/public/venue-info";

export const metadata: Metadata = {
  title: { absolute: "Oasis Pachacámac · Casa de campo para eventos en Pachacámac" },
  description:
    "Bodas, eventos corporativos y full days con piscina en una casa de campo exclusiva en Pachacámac, Lima. Consulta disponibilidad y cotiza en línea.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const info = await venueInfo();
  const from = info.pricesEnabled ? Math.min(...Object.values(info.fromPrice)) : null;
  const faq = [separateFaq(info), ...FAQ.filter((f) => f.q !== "¿Cómo separo una fecha?")];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueJsonLd(info)) }}
      />
      <section className="bg-brand-green text-brand-sand relative overflow-hidden">
        <BrandArt
          tone="green"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-40 lg:block"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <ReopeningBadge info={info} />
            <p className="text-brand-sand/70 text-sm tracking-[0.2em] uppercase">
              Pachacámac · Lima
            </p>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Casa de campo para celebrar en Pachacámac
            </h1>
            <p className="text-brand-sand/85 mt-4 max-w-prose text-lg">
              Bodas, eventos de empresa y full days con piscina, en un espacio exclusivo y bien
              gestionado. Un espacio <strong>sawa</strong>.
            </p>
            <HeroFacts info={info} from={Number.isFinite(from) ? from : null} />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/planners"
                className="border-brand-sand/50 rounded-md border px-5 py-3 hover:bg-white/10"
              >
                Soy planner
              </Link>
              {info.pricesEnabled && (
                <Link href="/precios" className="rounded-md px-5 py-3 underline hover:bg-white/10">
                  Ver precios
                </Link>
              )}
            </div>
          </div>
          <div
            id="cotizar"
            className="bg-card text-foreground scroll-mt-24 rounded-2xl p-5 shadow-2xl sm:p-6"
          >
            <h2 className="font-display mb-1 text-2xl sm:text-3xl">Consulta tu fecha</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Disponibilidad al instante y la cotización en minutos.
            </p>
            <QuoteFlow form="home" />
          </div>
        </div>
      </section>

      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <PolicyStrip info={info} />
        </div>
      </div>

      <Section title="Un espacio con personalidad, a tu manera">
        <Promise />
      </Section>
      <Section title="¿Qué quieres celebrar?" tone="sand">
        <SegmentCards />
      </Section>
      <Section title="Los espacios" lead="Todo el local es para tu evento: un solo evento por día.">
        <Spaces />
      </Section>
      <Section title="Así de simple es reservar" tone="sand">
        <HowItWorks info={info} />
      </Section>
      <Section title="Preguntas frecuentes">
        <Faq items={faq} />
      </Section>
      <Section title="Ubicación" className="pt-0">
        <Location info={info} />
      </Section>
      <CtaBand
        title="¿Ya tienes fecha en mente?"
        text="Consulta disponibilidad y recibe tu cotización hoy mismo."
      />
    </>
  );
}
