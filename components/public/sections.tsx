import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarSearch,
  Flame,
  Flower2,
  Handshake,
  MapPin,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Sun,
  Trees,
  Wallet,
  Waves,
} from "lucide-react";
import { FAQ, SEGMENTS } from "@/lib/content/segments";
import { PHOTOS } from "@/lib/content/photos";
import { formatDate, formatPEN } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { VenueInfo } from "@/server/public/venue-info";
import { BrandArt } from "./brand-art";

export function Section({
  id,
  title,
  lead,
  children,
  className = "",
  tone = "plain",
}: {
  id?: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "plain" | "sand";
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-t` : undefined}
      className={cn("scroll-mt-20", tone === "sand" && "bg-secondary/60")}
    >
      <div className={cn("mx-auto max-w-6xl px-4 py-14 md:py-20", className)}>
        <h2 id={id ? `${id}-t` : undefined} className="font-display text-3xl sm:text-4xl">
          {title}
        </h2>
        {lead && <p className="text-muted-foreground mt-2 max-w-2xl">{lead}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/** Datos clave del local para el hero: aforo, exclusividad, precio "desde" (si es público). */
export function HeroFacts({
  info,
  from,
  capacity = info.capacity.cocktail,
}: {
  info: VenueInfo;
  from?: number | null;
  capacity?: number | null;
}) {
  const facts = [
    capacity ? `Hasta ${capacity} invitados` : null,
    "Un solo evento por día",
    "Piscina, jardín y terraza",
    from ? `Desde ${formatPEN(from)} con IGV` : null,
  ].filter((f): f is string => Boolean(f));
  return (
    <ul className="mt-6 flex flex-wrap gap-2" aria-label="Datos del local">
      {facts.map((f) => (
        <li key={f} className="border-brand-sand/30 rounded-full border px-3 py-1 text-sm">
          {f}
        </li>
      ))}
    </ul>
  );
}

/** Aviso de reapertura (solo si la fecha es futura). */
export function ReopeningBadge({ info }: { info: VenueInfo }) {
  if (!info.reopeningDate || !info.reopeningUpcoming) return null;
  return (
    <p className="bg-brand-camel mb-5 inline-flex rounded-full px-3 py-1 text-sm font-medium text-[#2a2418]">
      Reabrimos el {formatDate(info.reopeningDate)} · Separa tu fecha de verano
    </p>
  );
}

export function Promise() {
  const items = [
    {
      icon: Flower2,
      title: "Un lugar con personalidad",
      text: "Jardín, terraza y piscina en el valle de Pachacámac, con espacio para celebrar sin apuros.",
    },
    {
      icon: Handshake,
      title: "Bien gestionado",
      text: "Coordinamos la operación del local antes, durante y después de tu evento.",
    },
    {
      icon: Sparkles,
      title: "A tu manera",
      text: "Tú eliges proveedores, música y decoración. Nosotros hacemos que el espacio funcione.",
    },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="grid content-start gap-3">
          <span className="bg-brand-green text-brand-camel grid size-12 place-items-center rounded-xl">
            <Icon className="size-6" aria-hidden />
          </span>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-muted-foreground">{text}</p>
        </div>
      ))}
    </div>
  );
}

export function SegmentCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SEGMENTS.map((s) => {
        const photo = PHOTOS.segments[s.slug];
        return (
          <Link
            key={s.slug}
            href={`/${s.slug}`}
            className="group bg-card overflow-hidden rounded-xl border transition-shadow hover:shadow-lg"
          >
            {photo ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                width={800}
                height={600}
                className="aspect-[4/3] object-cover"
              />
            ) : (
              <BrandArt tone={s.artTone} className="aspect-[4/3]" />
            )}
            <div className="p-5">
              <h3 className="font-display text-2xl">{s.nav}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{s.idealFor.join(" · ")}</p>
              <p className="text-brand-olive dark:text-brand-camel mt-3 text-sm font-medium group-hover:underline">
                Ver {s.nav.toLowerCase()} →
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function Spaces() {
  const spaces = [
    { icon: Waves, name: "Piscina", text: "Para refrescar el día y las fotos al atardecer." },
    {
      icon: Trees,
      name: "Jardín",
      text: "Para la ceremonia, el cóctel o el almuerzo al aire libre.",
    },
    { icon: Sun, name: "Terraza", text: "Techada, para el banquete o la pista de baile." },
    { icon: Flame, name: "Zona de parrilla", text: "Para full days y reuniones con parrilla." },
  ];
  if (PHOTOS.spaces.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {PHOTOS.spaces.map((p) => (
          <Image
            key={p.src}
            src={p.src}
            alt={p.alt}
            width={600}
            height={600}
            className="aspect-square rounded-xl object-cover"
          />
        ))}
      </div>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {spaces.map(({ icon: Icon, name, text }) => (
        <li key={name} className="bg-card grid content-start gap-2 rounded-xl border p-5">
          <Icon className="text-brand-olive dark:text-brand-camel size-6" aria-hidden />
          <p className="font-medium">{name}</p>
          <p className="text-muted-foreground text-sm">{text}</p>
        </li>
      ))}
    </ul>
  );
}

/** Cómo funciona la reserva, en 4 pasos, con las cifras de settings. */
export function HowItWorks({ info }: { info: VenueInfo }) {
  const deposit = info.depositPct !== null ? `${Math.round(info.depositPct * 100)} %` : null;
  const steps = [
    {
      icon: CalendarSearch,
      title: "Consulta tu fecha",
      text: "Mira la disponibilidad al instante y un rango referencial.",
    },
    {
      icon: CalendarCheck2,
      title: "Recibe tu cotización",
      text: info.holdHours
        ? `Te guardamos la fecha ${info.holdHours} horas sin costo mientras decides.`
        : "Te guardamos la fecha unas horas sin costo mientras decides.",
    },
    {
      icon: Wallet,
      title: "Sepárala",
      text: deposit
        ? `Con el adelanto del ${deposit} y un contrato simple.`
        : "Con el adelanto y un contrato simple.",
    },
    {
      icon: PartyPopper,
      title: "Celebra",
      text: "El día del evento te entregamos el local listo y lo recibimos al final.",
    },
  ];
  return (
    <ol className="grid gap-4 md:grid-cols-4">
      {steps.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className="bg-card relative grid content-start gap-2 rounded-xl border p-5">
          <span className="text-brand-camel font-display text-4xl leading-none">{i + 1}</span>
          <Icon className="text-brand-olive dark:text-brand-camel size-5" aria-hidden />
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-sm">{text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Reglas claras de reserva y pagos (políticas en simple). */
export function PolicyStrip({ info }: { info: VenueInfo }) {
  const items = [
    info.holdHours ? `Pre-reserva sin costo por ${info.holdHours} h` : null,
    info.depositPct !== null
      ? `Adelanto del ${Math.round(info.depositPct * 100)} % para separar`
      : null,
    info.balanceDueDays ? `Saldo hasta ${info.balanceDueDays} días antes` : null,
    "Garantía reembolsable",
    "Factura electrónica con IGV",
  ].filter((i): i is string => Boolean(i));
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {items.map((i) => (
        <li key={i} className="flex items-center gap-2">
          <ShieldCheck className="text-brand-olive dark:text-brand-camel size-4" aria-hidden /> {i}
        </li>
      ))}
    </ul>
  );
}

export function Faq({ items = FAQ }: { items?: readonly { q: string; a: string }[] }) {
  return (
    <div className="bg-card divide-y rounded-xl border">
      {items.map((f) => (
        <details key={f.q} className="group p-5">
          <summary className="cursor-pointer list-none font-medium after:float-right after:content-['+'] group-open:after:content-['–']">
            {f.q}
          </summary>
          <p className="text-muted-foreground mt-2 text-sm">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Ubicación: muestra dirección y mapa solo si están configurados (nunca "pendiente"). */
export function Location({ info }: { info: VenueInfo }) {
  return (
    <div className="bg-card grid gap-4 rounded-xl border p-6 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex gap-3">
        <MapPin
          className="text-brand-olive dark:text-brand-camel mt-0.5 size-5 shrink-0"
          aria-hidden
        />
        <div>
          <p className="font-medium">{info.address ?? "Pachacámac, Lima"}</p>
          <p className="text-muted-foreground text-sm">
            En el valle de Pachacámac, al sur de Lima. Te enviamos la ubicación exacta y la ruta al
            agendar tu visita.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {info.mapsUrl && (
          <a
            href={info.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Ver en Google Maps
          </a>
        )}
        <Link
          href="#cotizar"
          className="bg-brand-green text-brand-sand rounded-md px-4 py-2 text-sm font-medium"
        >
          Agendar una visita
        </Link>
      </div>
    </div>
  );
}

/** Franja final de llamada a la acción. */
export function CtaBand({ title, text }: { title: string; text: string }) {
  return (
    <section className="bg-brand-green text-brand-sand">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12">
        <div>
          <p className="font-display text-3xl">{title}</p>
          <p className="text-brand-sand/80 mt-1">{text}</p>
        </div>
        <Link
          href="#cotizar"
          className="bg-brand-camel rounded-md px-5 py-3 font-medium text-[#2a2418] hover:opacity-90"
        >
          Consultar mi fecha
        </Link>
      </div>
    </section>
  );
}
