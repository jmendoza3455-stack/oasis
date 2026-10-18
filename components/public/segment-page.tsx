import { Check } from "lucide-react";
import { AvailabilityChecker } from "./availability-checker";
import { PhotoPlaceholder } from "./photo-placeholder";
import { Faq, QuoteAndLead, Section } from "./sections";
import type { Segment } from "@/lib/content/segments";

export function SegmentPage({ segment }: { segment: Segment }) {
  return (
    <>
      <section className="bg-brand-green text-brand-sand">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-brand-sand/70 text-sm tracking-[0.2em] uppercase">{segment.nav}</p>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">
              {segment.title}
            </h1>
            <p className="text-brand-sand/85 mt-4 text-lg">{segment.lead}</p>
            <ul className="mt-6 grid gap-2">
              {segment.promise.map((p) => (
                <li key={p} className="flex gap-2">
                  <Check className="text-brand-camel mt-1 size-4 shrink-0" aria-hidden /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            <PhotoPlaceholder label={segment.nav} className="aspect-[16/10]" />
            <div className="bg-card text-foreground rounded-xl p-5">
              <h2 className="font-display mb-3 text-2xl">¿Está libre tu fecha?</h2>
              <AvailabilityChecker />
            </div>
          </div>
        </div>
      </section>
      <Section title="Ideal para">
        <ul className="grid gap-3 sm:grid-cols-3">
          {segment.idealFor.map((i) => (
            <li key={i} className="bg-card rounded-xl border p-5 font-medium">
              {i}
            </li>
          ))}
        </ul>
      </Section>
      <Section id="cotizar" title={segment.cta} className="pt-0">
        <QuoteAndLead eventType={segment.eventType} form={segment.slug} />
      </Section>
      <Section title="Preguntas frecuentes" className="pt-0">
        <Faq />
      </Section>
    </>
  );
}
