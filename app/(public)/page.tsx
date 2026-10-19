import type { Metadata } from "next";
import Link from "next/link";
import { BrandArt } from "@/components/public/brand-art";
import { CtaLink } from "@/components/public/cta-link";
import { EventChooser, type EventOption } from "@/components/public/event-chooser";
import {
  CtaBand,
  Faq,
  HeroFacts,
  HowItWorks,
  Location,
  PolicyStrip,
  Promise,
  ReopeningNote,
  Section,
  Spaces,
} from "@/components/public/sections";
import { separateFaq } from "@/lib/content/faq";
import { PHOTOS } from "@/lib/content/photos";
import { venueJsonLd } from "@/lib/content/seo";
import { FAQ, SEGMENTS } from "@/lib/content/segments";
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
  const options: EventOption[] = SEGMENTS.map((s) => ({
    slug: s.slug,
    label: s.nav,
    hint: s.idealFor.slice(0, 2).join(" · "),
    types: s.quoteTypes,
    defaultGuests: s.defaultGuests,
    artTone: s.artTone,
    photo: PHOTOS.segments[s.slug],
  }));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(venueJsonLd(info)) }}
      />
      <section className="bg-brand-green text-brand-sand relative overflow-hidden">
        <BrandArt
          tone="green"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-60 lg:block"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-24">
          <div className="max-w-xl">
            <p className="text-brand-sand/70 text-sm tracking-[0.2em] uppercase">
              Pachacámac · Lima
            </p>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Casa de campo para celebrar en Pachacámac
            </h1>
            <p className="text-brand-sand/85 mt-4 text-lg">
              Bodas, eventos de empresa y full days con piscina, en un espacio exclusivo y bien
              gestionado.
            </p>
            <HeroFacts info={info} from={Number.isFinite(from) ? from : null} />
            <CtaLink className="bg-brand-camel mt-8 inline-flex rounded-md px-6 py-3.5 text-base font-medium text-[#2a2418] shadow-lg hover:opacity-90" />
            <ReopeningNote info={info} />
            <p className="text-brand-sand/70 mt-6 text-sm">
              ¿Eres wedding planner?{" "}
              <Link href="/planners" className="text-brand-sand underline">
                Conoce el programa
              </Link>
            </p>
          </div>
        </div>
      </section>

      <Section
        id="cotizar"
        title="¿Qué quieres celebrar?"
        lead="Elige el tipo de evento y consulta tus fechas libres al instante."
      >
        <EventChooser options={options} />
      </Section>
      <Section title="Un espacio con personalidad, a tu manera" tone="sand">
        <Promise />
      </Section>
      <Section title="Los espacios" lead="Todo el local es para tu evento: un solo evento por día.">
        <Spaces />
      </Section>
      <Section title="Así de simple es reservar" tone="sand">
        <HowItWorks info={info} />
        <PolicyStrip info={info} className="mt-6" />
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
