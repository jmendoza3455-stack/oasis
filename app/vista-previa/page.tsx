import Link from "next/link";
import { CalendarCheck2, CreditCard, PartyPopper } from "lucide-react";
import { BeforeAfter } from "@/components/brand-site/before-after";
import { BASE } from "@/components/brand-site/brand-header";
import { ExperienceCard, UpcomingVenueCard, VenueCard } from "@/components/brand-site/cards";
import { SearchForm } from "@/components/brand-site/search-form";
import { BrandArt } from "@/components/public/brand-art";
import { Section } from "@/components/public/sections";
import { EXPERIENCES } from "@/lib/content/experiences";
import { brandVenues, limaToday, requirePreview } from "@/server/brand-preview";

const STEPS = [
  {
    icon: PartyPopper,
    title: "Elige tu experiencia",
    text: "Un paquete armado o solo el local, según lo que necesites.",
  },
  {
    icon: CalendarCheck2,
    title: "Mira las fechas libres",
    text: "La disponibilidad es en vivo: lo que ves libre, está libre.",
  },
  {
    icon: CreditCard,
    title: "Separa en línea",
    text: "Paga el adelanto con tarjeta o Yape y recibe tu contrato. (Pasarela en preparación.)",
  },
];

export default async function BrandHome() {
  await requirePreview();
  const venues = await brandVenues();
  return (
    <>
      <section className="bg-brand-green text-brand-sand relative overflow-hidden">
        <BrandArt
          tone="green"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-50 lg:block"
        />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-14 md:py-24">
          <div className="max-w-2xl">
            <p className="text-brand-sand/70 text-sm tracking-[0.2em] uppercase">
              Experiencias fuera de la ciudad
            </p>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Celebra en el campo, con todo resuelto
            </h1>
            <p className="text-brand-sand/85 mt-4 text-lg">
              Locales exclusivos y experiencias armadas para bodas, empresas y días en familia. Tú
              eliges la fecha; nosotros coordinamos el lugar y los proveedores.
            </p>
          </div>
          <SearchForm min={limaToday()} />
        </div>
      </section>

      <Section title="Así de simple">
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="bg-card grid gap-2 rounded-2xl border p-5">
              <span className="text-muted-foreground text-xs">Paso {i + 1}</span>
              <Icon className="text-brand-olive dark:text-brand-camel size-6" aria-hidden />
              <h3 className="font-medium">{title}</h3>
              <p className="text-muted-foreground text-sm">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Experiencias"
        lead="Paquetes que combinan el local con proveedores aliados. Los de abajo son ejemplos del formato."
        tone="sand"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {EXPERIENCES.map((e) => (
            <ExperienceCard key={e.slug} e={e} />
          ))}
        </div>
        <Link href={`${BASE}/experiencias`} className="mt-6 inline-block underline">
          Ver todas las experiencias
        </Link>
      </Section>

      <Section title="Nuestros locales" lead="Un solo evento por día en cada local.">
        <div className="grid gap-6">
          {venues.map((v) => (
            <VenueCard key={v.slug} v={v} />
          ))}
          <UpcomingVenueCard />
        </div>
      </Section>

      <Section
        title="Renovamos para ti"
        lead="Oasis Pachacámac reabre el 17/12/2026. Así va la obra."
        tone="sand"
      >
        <div className="max-w-3xl">
          <BeforeAfter
            label="Jardín de Oasis Pachacámac"
            before={{
              src: "/placeholders/antes.svg",
              alt: "Jardín antes de la obra (foto pendiente)",
            }}
            after={{
              src: "/placeholders/despues.svg",
              alt: "Jardín después de la obra (foto pendiente)",
            }}
          />
        </div>
      </Section>
    </>
  );
}
