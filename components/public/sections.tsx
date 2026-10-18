import Link from "next/link";
import { Flower2, Handshake, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FAQ, SEGMENTS } from "@/lib/content/segments";
import { PhotoPlaceholder } from "./photo-placeholder";
import { LazyLeadForm, LazyQuoteWidget } from "./lazy-forms";
import type { EventType } from "@/lib/domain";

export function Section({
  id,
  title,
  lead,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`mx-auto max-w-6xl scroll-mt-20 px-4 py-14 ${className}`}
      aria-labelledby={id ? `${id}-t` : undefined}
    >
      <h2 id={id ? `${id}-t` : undefined} className="font-display text-3xl sm:text-4xl">
        {title}
      </h2>
      {lead && <p className="text-muted-foreground mt-2 max-w-2xl">{lead}</p>}
      <div className="mt-8">{children}</div>
    </section>
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
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(({ icon: Icon, title, text }) => (
        <Card key={title}>
          <CardHeader>
            <Icon className="text-brand-olive size-6" aria-hidden />
            <CardTitle className="mt-2">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{text}</CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SegmentCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SEGMENTS.map((s) => (
        <Link
          key={s.slug}
          href={`/${s.slug}`}
          className="group bg-card overflow-hidden rounded-xl border"
        >
          <PhotoPlaceholder label={s.nav} className="aspect-[4/3] rounded-none" />
          <div className="p-5">
            <h3 className="font-display text-2xl group-hover:underline">{s.nav}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{s.idealFor.join(" · ")}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function Spaces() {
  const spaces = ["Piscina", "Jardín", "Terraza", "Zona de parrilla"];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {spaces.map((s) => (
        <figure key={s} className="grid gap-2">
          <PhotoPlaceholder label={s} className="aspect-square" />
          <figcaption className="text-sm font-medium">{s}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function QuoteAndLead({
  eventType = "wedding",
  form,
}: {
  eventType?: EventType;
  form: string;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Cotizador rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <LazyQuoteWidget defaultEventType={eventType} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recibe tu cotización</CardTitle>
        </CardHeader>
        <CardContent>
          <LazyLeadForm defaultEventType={eventType} form={form} />
        </CardContent>
      </Card>
    </div>
  );
}

export function Faq() {
  return (
    <div className="bg-card divide-y rounded-xl border">
      {FAQ.map((f) => (
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

export function TestimonialsPlaceholder() {
  return (
    <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
      Testimonios de clientes: <strong>pendiente</strong>. Se publicarán reseñas reales con
      autorización de cada cliente.
    </div>
  );
}
