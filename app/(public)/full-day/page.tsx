import type { Metadata } from "next";
import { SegmentPage } from "@/components/public/segment-page";
import { SEGMENTS } from "@/lib/content/segments";

export const metadata: Metadata = {
  title: "Full day familiar con piscina",
  description:
    "Alquila una casa de campo completa con piscina, jardín y parrilla en Pachacámac para tu familia o grupo.",
  alternates: { canonical: "/full-day" },
  openGraph: {
    title: "Full day familiar con piscina · Oasis Pachacámac",
    description:
      "Alquila una casa de campo completa con piscina, jardín y parrilla en Pachacámac para tu familia o grupo.",
  },
};

export default function Page() {
  return <SegmentPage segment={SEGMENTS.find((s) => s.slug === "full-day")!} />;
}
