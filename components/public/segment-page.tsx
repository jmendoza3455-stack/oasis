import Image from "next/image";
import { Check, Clock, Moon, Store, Users } from "lucide-react";
import { segmentFaq } from "@/lib/content/faq";
import { PHOTOS } from "@/lib/content/photos";
import type { Segment } from "@/lib/content/segments";
import { formatPEN } from "@/lib/domain";
import type { VenueInfo } from "@/server/public/venue-info";
import { BrandArt } from "./brand-art";
import { QuoteFlow } from "./quote-flow";
import {
  CtaBand,
  Faq,
  HeroFacts,
  HowItWorks,
  PolicyStrip,
  ReopeningBadge,
  Section,
  Spaces,
} from "./sections";

/** Ficha técnica del segmento con datos de settings; lo no configurado no se muestra. */
function Specs({ segment, info }: { segment: Segment; info: VenueInfo }) {
  const cap = info.capacity;
  const slot = (k: string) => {
    const h = info.slotHours[k];
    return h ? `${h[0]} a ${h[1]}` : null;
  };
  const rows = [
    segment.slug === "full-day"
      ? cap.full_day && { icon: Users, label: "Aforo", value: `Hasta ${cap.full_day} personas` }
      : (cap.cocktail || cap.banquet) && {
          icon: Users,
          label: "Aforo",
          value: [
            cap.cocktail && `${cap.cocktail} en cóctel`,
            cap.banquet && `${cap.banquet} en banquete`,
          ]
            .filter(Boolean)
            .join(" · "),
        },
    slot("full_day") && { icon: Clock, label: "Horario de día", value: slot("full_day")! },
    segment.slug !== "full-day" &&
      slot("night") && { icon: Moon, label: "Horario de noche", value: slot("night")! },
    {
      icon: Store,
      label: "Proveedores",
      value: "Libres: catering, música y decoración a tu elección",
    },
    info.pricesEnabled &&
      info.fromPrice[segment.eventType] && {
        icon: Check,
        label: "Alquiler del local",
        value: `Desde ${formatPEN(info.fromPrice[segment.eventType]!)} con IGV`,
      },
  ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[];
  return (
    <dl className="bg-card grid divide-y rounded-xl border">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3 p-4">
          <Icon className="text-brand-olive mt-0.5 size-5 shrink-0" aria-hidden />
          <dt className="w-36 shrink-0 font-medium">{label}</dt>
          <dd className="text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SegmentPage({ segment, info }: { segment: Segment; info: VenueInfo }) {
  const photo = PHOTOS.segments[segment.slug];
  const from = info.pricesEnabled ? (info.fromPrice[segment.eventType] ?? null) : null;
  return (
    <>
      <section className="bg-brand-green text-brand-sand">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 md:py-20 lg:grid-cols-[1fr_1fr]">
          <div>
            <ReopeningBadge info={info} />
            <p className="text-brand-sand/70 text-sm tracking-[0.2em] uppercase">{segment.nav}</p>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">
              {segment.title}
            </h1>
            <p className="text-brand-sand/85 mt-4 text-lg">{segment.lead}</p>
            <ul className="mt-6 grid gap-2">
              {segment.promise.map((p) => (
                <li key={p} className="flex gap-2">
                  <Check className="text-brand-camel mt-1 size-4 shrink-0" aria-hidden /> {p}
                </li>
              ))}
            </ul>
            <HeroFacts info={info} from={from} capacity={info.capacity[segment.capacityKey]} />
            {photo ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                width={900}
                height={560}
                className="mt-8 hidden aspect-[16/10] rounded-xl object-cover lg:block"
              />
            ) : (
              <BrandArt
                tone={segment.artTone}
                className="mt-8 hidden aspect-[16/9] rounded-xl lg:block"
              />
            )}
          </div>
          <div
            id="cotizar"
            className="bg-card text-foreground scroll-mt-24 rounded-2xl p-5 shadow-2xl sm:p-6"
          >
            <h2 className="font-display mb-1 text-2xl sm:text-3xl">{segment.cta}</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Disponibilidad al instante y la cotización en minutos.
            </p>
            <QuoteFlow
              form={segment.slug}
              defaultEventType={segment.eventType}
              defaultGuests={segment.defaultGuests}
            />
          </div>
        </div>
      </section>
      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <PolicyStrip info={info} />
        </div>
      </div>
      <Section title="Ficha del local">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <Specs segment={segment} info={info} />
          <div>
            <p className="font-medium">Ideal para</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {segment.idealFor.map((i) => (
                <li key={i} className="bg-secondary rounded-full px-3 py-1.5 text-sm">
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
      <Section title="Los espacios" tone="sand">
        <Spaces />
      </Section>
      <Section title="Así de simple es reservar">
        <HowItWorks info={info} />
      </Section>
      <Section title="Preguntas frecuentes" tone="sand">
        <Faq items={segmentFaq(segment, info)} />
      </Section>
      <CtaBand title={segment.cta} text="Te respondemos en minutos con disponibilidad y precio." />
    </>
  );
}
