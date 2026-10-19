import type { Metadata } from "next";
import { ExperienceCard } from "@/components/brand-site/cards";
import { Section } from "@/components/public/sections";
import { EXPERIENCES } from "@/lib/content/experiences";
import { requirePreview } from "@/server/brand-preview";

export const metadata: Metadata = { title: "Experiencias" };

export default async function Experiences() {
  await requirePreview();
  return (
    <Section
      title="Experiencias"
      lead="Paquetes que combinan el local con proveedores aliados, coordinados por nosotros. Ejemplos del formato: el catálogo real se arma con los proveedores."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {EXPERIENCES.map((e) => (
          <ExperienceCard key={e.slug} e={e} />
        ))}
      </div>
    </Section>
  );
}
