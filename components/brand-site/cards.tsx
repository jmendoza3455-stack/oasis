import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Experience } from "@/lib/content/experiences";
import { SEGMENTS } from "@/lib/content/segments";
import type { BrandVenue } from "@/server/brand-preview";
import { BASE } from "./brand-header";
import { PhotoSlot } from "./photo-slot";

export const segmentLabel = (slug: string) => SEGMENTS.find((s) => s.slug === slug)?.nav ?? slug;

export function ExampleBadge() {
  return (
    <Badge variant="outline" className="border-dashed">
      Ejemplo
    </Badge>
  );
}

export function ExperienceCard({ e }: { e: Experience }) {
  return (
    <article className="bg-card group grid overflow-hidden rounded-2xl border">
      <PhotoSlot src={e.photo} alt={e.name} className="rounded-none" />
      <div className="grid gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            {segmentLabel(e.segment)}
          </span>
          <ExampleBadge />
        </div>
        <h3 className="font-display text-2xl">{e.name}</h3>
        <p className="text-muted-foreground text-sm">{e.summary}</p>
        <Link
          href={`${BASE}/experiencias/${e.slug}`}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 group-hover:underline"
        >
          Ver qué incluye <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

const STATUS = {
  free: { label: "Libre", tone: "bg-primary text-primary-foreground" },
  hold: { label: "En espera", tone: "bg-secondary" },
  taken: { label: "Ocupado", tone: "bg-muted text-muted-foreground" },
} as const;

export function VenueCard({
  v,
  status,
  fits,
}: {
  v: BrandVenue;
  status?: keyof typeof STATUS;
  fits?: boolean;
}) {
  const cap = Math.max(...Object.values(v.capacity).map((c) => c ?? 0));
  return (
    <article className="bg-card grid overflow-hidden rounded-2xl border md:grid-cols-[1fr_1.2fr]">
      <PhotoSlot src="/placeholders/jardin.svg" alt={v.name} className="h-full rounded-none" />
      <div className="grid content-start gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-2xl">{v.name}</h3>
          {status && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[status].tone}`}
            >
              {STATUS[status].label}
            </span>
          )}
          {fits === false && (
            <span className="bg-destructive/10 text-destructive rounded-full px-2.5 py-0.5 text-xs font-medium">
              Supera el aforo
            </span>
          )}
        </div>
        <ul className="text-muted-foreground grid gap-1 text-sm">
          <li className="flex items-center gap-2">
            <MapPin className="size-4" aria-hidden /> {v.address ?? "Pachacámac, Lima"}
          </li>
          {cap > 0 && (
            <li className="flex items-center gap-2">
              <Users className="size-4" aria-hidden /> Hasta {cap} invitados
            </li>
          )}
        </ul>
        <Link
          href={`${BASE}/locales/${v.slug}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-fit items-center gap-1 rounded-md px-4 py-2 text-sm font-medium"
        >
          Ver el local <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

/** Tarjeta de un local por anunciar (marca de varios locales, sin inventar cuál). */
export function UpcomingVenueCard() {
  return (
    <article className="grid place-content-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center">
      <p className="font-display text-2xl">Próximo local</p>
      <p className="text-muted-foreground text-sm">Por anunciar</p>
    </article>
  );
}
