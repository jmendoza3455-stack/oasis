"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { EventType } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { BrandArt } from "./brand-art";
import { QuoteFlow } from "./quote-flow";

export type EventOption = {
  slug: string;
  label: string;
  hint: string;
  types: EventType[];
  defaultGuests: number;
  artTone: "green" | "olive" | "camel" | "slate";
  photo: { src: string; alt: string } | null;
};

/**
 * Paso 1 de la home: el cliente elige qué celebra y recién entonces se despliega la consulta de
 * fecha (con el tipo ya cargado). Un clic a la vez, sin formularios a la vista de entrada.
 */
export function EventChooser({ options }: { options: EventOption[] }) {
  const [selected, setSelected] = useState<EventOption | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const choose = (o: EventOption) => {
    setSelected(o);
    // En móvil el panel queda debajo de las tarjetas: se lleva a la vista
    requestAnimationFrame(() =>
      panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  return (
    <div className="grid gap-6">
      <div role="group" aria-label="Tipo de evento" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {options.map((o) => {
          const active = selected?.slug === o.slug;
          return (
            <button
              key={o.slug}
              type="button"
              aria-pressed={active}
              onClick={() => choose(o)}
              className={cn(
                "group bg-card flex items-center gap-4 overflow-hidden rounded-xl border text-left transition sm:block",
                "hover:shadow-lg focus-visible:outline-none",
                active
                  ? "ring-brand-camel border-transparent shadow-lg ring-2"
                  : "focus-visible:ring-ring focus-visible:ring-2",
              )}
            >
              {o.photo ? (
                <Image
                  src={o.photo.src}
                  alt=""
                  width={800}
                  height={600}
                  className="aspect-square w-24 shrink-0 object-cover sm:aspect-[4/3] sm:w-full"
                />
              ) : (
                <BrandArt
                  tone={o.artTone}
                  className="aspect-square w-24 shrink-0 sm:aspect-[4/3] sm:w-full"
                />
              )}
              <span className="block py-3 pr-4 sm:p-5">
                <span className="font-display block text-2xl">{o.label}</span>
                <span className="text-muted-foreground mt-1 block text-sm">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div ref={panel} className="scroll-mt-24">
        {selected ? (
          <div className="bg-card grid gap-4 rounded-2xl border p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-2xl">{selected.label}: elige tu fecha</h3>
              <Link
                href={`/${selected.slug}`}
                className="text-muted-foreground text-sm hover:underline"
              >
                Más sobre {selected.label.toLowerCase()} →
              </Link>
            </div>
            <QuoteFlow
              key={selected.slug}
              form={`home-${selected.slug}`}
              types={selected.types}
              defaultGuests={selected.defaultGuests}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            Elige una opción y te mostramos las fechas libres al instante.
          </p>
        )}
      </div>
    </div>
  );
}
