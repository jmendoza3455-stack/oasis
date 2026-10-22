import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PUBLIC_BASE } from "@/components/brand-site/brand-header";
import { segmentLabel, VenueCard } from "@/components/brand-site/cards";
import { SearchForm } from "@/components/brand-site/search-form";
import { Section } from "@/components/public/sections";
import { SEGMENTS } from "@/lib/content/segments";
import { formatDate } from "@/lib/domain";
import { availabilityOn, brandVenues, limaToday } from "@/server/brand-preview";

export const metadata: Metadata = { title: "Buscar" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/sawa/buscar">["searchParams"];
}) {
  await connection();
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const today = limaToday();
  const segment = SEGMENTS.find((s) => s.slug === str(sp.tipo));
  const raw = str(sp.fecha);
  const fecha = raw && ISO.test(raw) && raw >= today ? raw : undefined;
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
            base={PUBLIC_BASE}
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
              base={PUBLIC_BASE}
              photo={null}
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
    </>
  );
}

export default function SawaSearch(props: PageProps<"/sawa/buscar">) {
  return (
    <Suspense
      fallback={<div className="bg-muted mx-auto my-10 h-96 max-w-6xl animate-pulse rounded-2xl" />}
    >
      <Results searchParams={props.searchParams} />
    </Suspense>
  );
}
