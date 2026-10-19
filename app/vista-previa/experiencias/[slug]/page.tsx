import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Handshake, Home } from "lucide-react";
import { BASE } from "@/components/brand-site/brand-header";
import { ExampleBadge, segmentLabel } from "@/components/brand-site/cards";
import { Gallery } from "@/components/brand-site/gallery";
import { PhotoSlot } from "@/components/brand-site/photo-slot";
import { Section } from "@/components/public/sections";
import { experience } from "@/lib/content/experiences";
import { brandVenues, requirePreview } from "@/server/brand-preview";

const GALLERY = ["jardin", "terraza", "noche", "piscina", "parrilla", "ingreso"].map((p) => ({
  src: `/placeholders/${p}.svg`,
  alt: `${p} (foto pendiente)`,
}));

export default async function ExperiencePage({
  params,
}: PageProps<"/vista-previa/experiencias/[slug]">) {
  await requirePreview();
  const { slug } = await params;
  const e = experience(slug);
  if (!e) notFound();
  const venues = (await brandVenues()).filter((v) => e.venues.includes(v.slug));
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.2fr_1fr] lg:py-16">
        <PhotoSlot src={e.photo} alt={e.name} priority />
        <div className="grid content-start gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm tracking-wide uppercase">
              {segmentLabel(e.segment)}
            </span>
            <ExampleBadge />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl">{e.name}</h1>
          <p className="text-muted-foreground text-lg">{e.summary}</p>
          <dl className="bg-card grid gap-1 rounded-xl border p-4 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Precio</dt>
              <dd>Por definir con los proveedores</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Dónde</dt>
              <dd>{venues.map((v) => v.name).join(", ")}</dd>
            </div>
          </dl>
          <Link
            href={`${BASE}/buscar?tipo=${e.segment}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-fit rounded-md px-5 py-3 font-medium"
          >
            Consultar fechas
          </Link>
        </div>
      </section>
      <Section title="Qué incluye" tone="sand">
        <ul className="grid gap-3 md:grid-cols-2">
          {e.includes.map((i) => (
            <li key={i.label} className="bg-card flex items-start gap-3 rounded-xl border p-4">
              {i.by === "local" ? (
                <Home
                  className="text-brand-olive dark:text-brand-camel mt-0.5 size-5"
                  aria-hidden
                />
              ) : (
                <Handshake
                  className="text-brand-olive dark:text-brand-camel mt-0.5 size-5"
                  aria-hidden
                />
              )}
              <span>
                <span className="font-medium">{i.label}</span>
                <span className="text-muted-foreground block text-sm">
                  {i.by === "local" ? "Del local" : "Proveedor aliado (por definir)"}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-medium">Ideal para</p>
        <ul className="text-muted-foreground mt-2 grid gap-1">
          {e.idealFor.map((i) => (
            <li key={i} className="flex gap-2">
              <Check className="mt-1 size-4" aria-hidden /> {i}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Galería">
        <Gallery photos={GALLERY} label={`Fotos de ${e.name}`} />
      </Section>
    </>
  );
}
