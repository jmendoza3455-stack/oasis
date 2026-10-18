import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, HandCoins, ShieldCheck, Sparkles } from "lucide-react";
import { Section } from "@/components/public/sections";
import { PlannerApplicationForm } from "@/components/public/simple-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Programa de planners",
  description:
    "Programa para wedding y event planners: disponibilidad en línea, pre-reservas de 72 horas, protección de tus clientes por 90 días y 5 % de comisión.",
  alternates: { canonical: "/planners" },
};

const BENEFITS = [
  {
    icon: CalendarClock,
    title: "Disponibilidad en línea",
    text: "Revisa fechas libres y separa una pre-reserva por 72 horas mientras tu cliente decide.",
  },
  {
    icon: ShieldCheck,
    title: "Tus clientes protegidos",
    text: "Si un cliente que registraste nos escribe directo dentro de los 90 días, se respeta tu gestión.",
  },
  {
    icon: HandCoins,
    title: "5 % de comisión",
    text: "Sobre el alquiler del espacio sin IGV. Se paga 7 días después del evento realizado y cobrado.",
  },
  {
    icon: Sparkles,
    title: "Tú eres la protagonista",
    text: "Nosotros hacemos que el espacio funcione; tú haces que el evento sea único. Proveedores libres.",
  },
];

export default function PlannersPage() {
  return (
    <>
      <section className="bg-brand-green text-brand-sand">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className="text-brand-sand/70 text-sm tracking-[0.2em] uppercase">Planners aliadas</p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
            Nosotros hacemos que el espacio funcione; tú haces que el evento sea único.
          </h1>
          <p className="text-brand-sand/85 mt-4 max-w-2xl text-lg">
            Un socio operativo confiable para wedding y event planners, con reglas claras y un
            portal propio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#alta"
              className="bg-brand-camel rounded-md px-5 py-3 font-medium text-[#2a2418] hover:opacity-90"
            >
              Solicitar alta
            </Link>
            <Link
              href="/ingresar"
              className="border-brand-sand/50 rounded-md border px-5 py-3 hover:bg-white/10"
            >
              Ya soy planner: ingresar
            </Link>
          </div>
        </div>
      </section>
      <Section title="Cómo funciona">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="text-brand-olive size-6" aria-hidden />
                <CardTitle className="mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{text}</CardContent>
            </Card>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 text-sm">
          El alta es por invitación tras una visita técnica. En tu primer ingreso aceptas el
          contrato marco del programa. Puedes tener hasta 2 pre-reservas activas a la vez.
        </p>
      </Section>
      <Section id="alta" title="Solicita tu alta" className="pt-0">
        <Card>
          <CardContent className="pt-5">
            <PlannerApplicationForm />
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
