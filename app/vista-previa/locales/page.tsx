import type { Metadata } from "next";
import { UpcomingVenueCard, VenueCard } from "@/components/brand-site/cards";
import { Section } from "@/components/public/sections";
import { brandVenues, requirePreview } from "@/server/brand-preview";

export const metadata: Metadata = { title: "Locales" };

export default async function Venues() {
  await requirePreview();
  const venues = await brandVenues();
  return (
    <Section title="Locales" lead="Casas de campo exclusivas: un solo evento por día en cada una.">
      <div className="grid gap-6">
        {venues.map((v) => (
          <VenueCard key={v.slug} v={v} />
        ))}
        <UpcomingVenueCard />
      </div>
    </Section>
  );
}
