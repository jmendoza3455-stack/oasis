import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarCheck2, Handshake, MapPinned } from "lucide-react";
import { PUBLIC_BASE } from "@/components/brand-site/brand-header";
import { UpcomingVenueCard, VenueCard } from "@/components/brand-site/cards";
import { SearchForm } from "@/components/brand-site/search-form";
import { BrandArt } from "@/components/public/brand-art";
import { Section } from "@/components/public/sections";
import { brandVenues, limaToday } from "@/server/brand-preview";

const STEPS = [
  {
    icon: MapPinned,
    title: "Elige el local",
    text: "Casas de campo exclusivas: un solo evento por día en cada una.",
  },
  {
    icon: CalendarCheck2,
    title: "Mira las fechas libres",
    text: "La disponibilidad es en vivo: lo que ves libre, está libre.",
  },
  {
    icon: Handshake,
    title: "Separa y celebra",
    text: "Te enviamos la cotización y coordinamos contigo y tu planner.",
  },
];

async function Search() {
  await connection();
  return <SearchForm min={limaToday()} base={PUBLIC_BASE} />;
}

async function Venues() {
  const venues = await brandVenues();
  return (
    <div className="grid gap-6">
      {venues.map((v) => (
        <VenueCard key={v.slug} v={v} base={PUBLIC_BASE} photo={null} />
      ))}
      <UpcomingVenueCard />
    </div>
  );
}

export default function SawaHome() {
  return (
    <>
      <section className="bg-brand-green text-brand-sand relative overflow-hidden">
        <BrandArt
          tone="green"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-50 lg:block"
        />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-14 md:py-24">
          <div className="max-w-2xl">
            <p className="text-brand-sand/80 text-sm tracking-[0.2em] uppercase">
              sawa · gestión de espacios &amp; experiencias
            </p>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Celebra en el campo, con todo resuelto
            </h1>
            <p className="text-brand-sand/85 mt-4 text-lg">
              Locales exclusivos para bodas, empresas y días en familia. Tú eliges la fecha;
              nosotros hacemos que el espacio funcione.
            </p>
          </div>
          <Suspense fallback={<div className="h-24 rounded-2xl bg-white/10" />}>
            <Search />
          </Suspense>
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

      <Section title="Nuestros locales" lead="Un solo evento por día en cada local." tone="sand">
        <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-2xl" />}>
          <Venues />
        </Suspense>
      </Section>

      <Section
        title="Experiencias"
        lead="Muy pronto: paquetes que combinan el local con proveedores aliados, coordinados por nosotros."
      >
        <p className="text-muted-foreground">
          ¿Eres proveedor de catering, decoración o actividades?{" "}
          <Link href="/planners" className="underline">
            Conoce el programa de aliados
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
