import type { Metadata } from "next";
import { ExperienceCard, segmentLabel, VenueCard } from "@/components/brand-site/cards";
import { SearchForm } from "@/components/brand-site/search-form";
import { Section } from "@/components/public/sections";
import { EXPERIENCES } from "@/lib/content/experiences";
import { SEGMENTS } from "@/lib/content/segments";
import { formatDate } from "@/lib/domain";
import { availabilityOn, brandVenues, limaToday, requirePreview } from "@/server/brand-preview";

export const metadata: Metadata = { title: "Buscar" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function Search({ searchParams }: PageProps<"/vista-previa/buscar">) {
  await requirePreview();
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const today = limaToday();
  const segment = SEGMENTS.find((s) => s.slug === str(sp.tipo));
  const fecha =
    str(sp.fecha) && ISO.test(str(sp.fecha)!) && str(sp.fecha)! >= today
      ? str(sp.fecha)
      : undefined;
  const guests = Number(str(sp.invitados)) || undefined;

  const venues = await brandVenues();
  const status = fecha ? await availabilityOn(fecha) : {};
  const fits = (v: (typeof venues)[number]) => {
    if (!guests) return true;
    const key = segment?.capacityKey;
    const cap = key ? v.capacity[key] : Math.max(...Object.values(v.capacity).map((c) => c ?? 0));
    return !cap || guests <= cap;
  };
  const ranked = [...venues].sort(
    (a, b) =>
      Number(status[b.slug] === "free" && fits(b)) - Number(status[a.slug] === "free" && fits(a)),
  );
  const experiences = EXPERIENCES.filter((e) => !segment || e.segment === segment.slug);
  const summary = [
    segment ? segmentLabel(segment.slug) : "Cualquier evento",
    fecha ? formatDate(fecha) : "cualquier fecha",
    guests ? `${guests} invitados` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section className="bg-brand-green px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <SearchForm
            min={today}
            defaults={{
              tipo: segment?.slug,
              fecha,
              invitados: guests ? String(guests) : undefined,
            }}
          />
        </div>
      </section>
      <Section title="Locales" lead={summary}>
        <div className="grid gap-6">
          {ranked.map((v) => (
            <VenueCard
              key={v.slug}
              v={v}
              status={fecha ? status[v.slug] : undefined}
              fits={guests ? fits(v) : undefined}
            />
          ))}
        </div>
        {!fecha && (
          <p className="text-muted-foreground mt-4 text-sm">
            Elige una fecha para ver qué locales están libres ese día.
          </p>
        )}
      </Section>
      <Section title="Experiencias para tu evento" tone="sand">
        {experiences.length ? (
          <div className="grid gap-6 md:grid-cols-3">
            {experiences.map((e) => (
              <ExperienceCard key={e.slug} e={e} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Pronto tendremos experiencias para este tipo de evento.
          </p>
        )}
      </Section>
    </>
  );
}
