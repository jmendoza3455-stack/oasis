import type { Metadata } from "next";
import { SegmentPage } from "@/components/public/segment-page";
import { SEGMENTS } from "@/lib/content/segments";
import { venueInfo } from "@/server/public/venue-info";

export const metadata: Metadata = {
  title: "Bodas en Pachacámac",
  description:
    "Casa de campo para matrimonios, quinceañeros y aniversarios en Pachacámac. Exclusividad y libertad de proveedores.",
  alternates: { canonical: "/bodas" },
  openGraph: {
    title: "Bodas en Pachacámac · Oasis Pachacámac",
    description:
      "Casa de campo para matrimonios, quinceañeros y aniversarios en Pachacámac. Exclusividad y libertad de proveedores.",
  },
};

export default async function Page() {
  return (
    <SegmentPage segment={SEGMENTS.find((s) => s.slug === "bodas")!} info={await venueInfo()} />
  );
}
