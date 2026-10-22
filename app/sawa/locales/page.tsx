import { Suspense } from "react";
import type { Metadata } from "next";
import { PUBLIC_BASE } from "@/components/brand-site/brand-header";
import { UpcomingVenueCard, VenueCard } from "@/components/brand-site/cards";
import { Section } from "@/components/public/sections";
import { brandVenues } from "@/server/brand-preview";

export const metadata: Metadata = { title: "Locales" };

async function List() {
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

export default function SawaVenues() {
  return (
    <Section title="Locales" lead="Casas de campo exclusivas: un solo evento por día en cada una.">
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-2xl" />}>
        <List />
      </Suspense>
    </Section>
  );
}
