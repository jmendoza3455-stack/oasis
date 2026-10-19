import type { Metadata } from "next";
import { SegmentPage } from "@/components/public/segment-page";
import { SEGMENTS } from "@/lib/content/segments";
import { venueInfo } from "@/server/public/venue-info";

export const metadata: Metadata = {
  title: "Full day y team building para empresas",
  description:
    "Full days corporativos, team building y cierres de año en una casa de campo privada en Pachacámac. Factura con IGV.",
  alternates: { canonical: "/corporativo" },
  openGraph: {
    title: "Full day y team building para empresas · Oasis Pachacámac",
    description:
      "Full days corporativos, team building y cierres de año en una casa de campo privada en Pachacámac. Factura con IGV.",
  },
};

export default async function Page() {
  return (
    <SegmentPage
      segment={SEGMENTS.find((s) => s.slug === "corporativo")!}
      info={await venueInfo()}
    />
  );
}
