import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Users } from "lucide-react";
import { BeforeAfter } from "@/components/brand-site/before-after";
import { ExperienceCard } from "@/components/brand-site/cards";
import { Gallery } from "@/components/brand-site/gallery";
import { Section } from "@/components/public/sections";
import { EXPERIENCES } from "@/lib/content/experiences";
import { brandVenues, requirePreview } from "@/server/brand-preview";

const SPACES = [
  ["jardin", "Jardín"],
  ["piscina", "Piscina"],
  ["terraza", "Terraza techada"],
  ["parrilla", "Zona de parrilla"],
  ["noche", "Montaje de noche"],
  ["ingreso", "Ingreso y estacionamiento"],
] as const;

export default async function VenuePage({ params }: PageProps<"/vista-previa/locales/[slug]">) {
  await requirePreview();
  const { slug } = await params;
  const v = (await brandVenues()).find((x) => x.slug === slug);
  if (!v) notFound();
  const cap = v.capacity;
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm tracking-wide uppercase">Local</p>
            <h1 className="font-display text-4xl sm:text-5xl">{v.name}</h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <MapPin className="size-4" aria-hidden /> {v.address ?? "Pachacámac, Lima"}
            </p>
          </div>
          {/* Hoy la web del local vive en la raíz; con la marca madre pasará a /locales/<local> */}
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-5 py-3 font-medium"
          >
            Ver calendario y cotizar
          </Link>
        </div>
        <Gallery
          label={`Fotos de ${v.name}`}
          photos={SPACES.map(([src, alt]) => ({
            src: `/placeholders/${src}.svg`,
            alt: `${alt} (foto pendiente)`,
          }))}
        />
      </section>
      <Section title="Ficha" tone="sand">
        <dl className="bg-card grid divide-y rounded-xl border sm:max-w-xl">
          {(
            [
              ["Cóctel", cap.cocktail],
              ["Banquete", cap.banquet],
              ["Full day", cap.full_day],
            ] as const
          )
            .filter(([, n]) => n)
            .map(([label, n]) => (
              <div key={label} className="flex items-center gap-3 p-4">
                <Users className="text-brand-olive dark:text-brand-camel size-5" aria-hidden />
                <dt className="w-28 font-medium">{label}</dt>
                <dd className="text-muted-foreground">Hasta {n} invitados</dd>
              </div>
            ))}
        </dl>
      </Section>
      <Section title="Antes y después de la obra">
        <div className="max-w-3xl">
          <BeforeAfter
            label={`Jardín de ${v.name}`}
            before={{ src: "/placeholders/antes.svg", alt: "Antes de la obra (foto pendiente)" }}
            after={{ src: "/placeholders/despues.svg", alt: "Después de la obra (foto pendiente)" }}
          />
        </div>
      </Section>
      <Section title="Experiencias en este local" tone="sand">
        <div className="grid gap-6 md:grid-cols-3">
          {EXPERIENCES.filter((e) => e.venues.includes(v.slug)).map((e) => (
            <ExperienceCard key={e.slug} e={e} />
          ))}
        </div>
      </Section>
    </>
  );
}
