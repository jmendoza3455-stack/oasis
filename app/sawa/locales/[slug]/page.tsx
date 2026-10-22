import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Users } from "lucide-react";
import { OasisLockup } from "@/components/brand/logo";
import { BrandArt } from "@/components/public/brand-art";
import { Section } from "@/components/public/sections";
import { brandVenues } from "@/server/brand-preview";

async function Venue({ params }: { params: PageProps<"/sawa/locales/[slug]">["params"] }) {
  const { slug } = await params;
  const v = (await brandVenues()).find((x) => x.slug === slug);
  if (!v) notFound();
  const cap = v.capacity;
  const rows = (
    [
      ["Cóctel", cap.cocktail],
      ["Banquete", cap.banquet],
      ["Full day", cap.full_day],
    ] as const
  ).filter(([, n]) => n);
  return (
    <>
      <section className="bg-brand-green text-brand-sand relative overflow-hidden">
        <BrandArt tone="green" className="pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl justify-items-start gap-6 px-4 py-16 md:py-24">
          <p className="text-brand-sand/80 text-sm tracking-[0.2em] uppercase">Local</p>
          {v.slug === "oasis-pachacamac" ? (
            <OasisLockup className="text-brand-sand" />
          ) : (
            <h1 className="font-display text-4xl sm:text-5xl">{v.name}</h1>
          )}
          <p className="text-brand-sand/85 flex items-center gap-2">
            <MapPin className="size-4" aria-hidden /> {v.address ?? "Pachacámac, Lima"}
          </p>
          {/* La web del local (calendario y cotizador) vive en su propio dominio por ahora */}
          <Link
            href="/"
            className="bg-brand-camel rounded-md px-6 py-3 font-medium text-[#2a2418] hover:opacity-90"
          >
            Ver calendario y cotizar
          </Link>
        </div>
      </section>
      {rows.length > 0 && (
        <Section title="Ficha" tone="sand">
          <dl className="bg-card grid divide-y rounded-xl border sm:max-w-xl">
            {rows.map(([label, n]) => (
              <div key={label} className="flex items-center gap-3 p-4">
                <Users className="text-brand-olive dark:text-brand-camel size-5" aria-hidden />
                <dt className="w-28 font-medium">{label}</dt>
                <dd className="text-muted-foreground">Hasta {n} invitados</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </>
  );
}

export default function SawaVenue(props: PageProps<"/sawa/locales/[slug]">) {
  return (
    <Suspense
      fallback={<div className="bg-muted mx-auto my-10 h-96 max-w-6xl animate-pulse rounded-2xl" />}
    >
      <Venue params={props.params} />
    </Suspense>
  );
}
