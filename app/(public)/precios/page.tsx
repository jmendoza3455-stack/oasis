import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand, PolicyStrip, Section } from "@/components/public/sections";
import { SEGMENTS } from "@/lib/content/segments";
import { formatPEN } from "@/lib/domain";
import { venueInfo } from "@/server/public/venue-info";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Precios transparentes del alquiler de Oasis Pachacámac por tipo de evento, día y temporada, con IGV.",
  alternates: { canonical: "/precios" },
};

const DAYS = [
  ["mon_thu", "Lunes a jueves"],
  ["fri", "Viernes"],
  ["sat", "Sábado"],
  ["sun_holiday", "Domingo y feriados"],
] as const;

/** Tarifario público (solo con public_prices_enabled; se valida antes en Configuración, S24). */
export default async function PreciosPage() {
  const info = await venueInfo();
  if (!info.pricesEnabled) notFound();
  const cell = (eventType: string, dayType: string, season: string) => {
    const r = info.rates.filter(
      (x) => x.eventType === eventType && x.dayType === dayType && x.season === season,
    );
    return r.length ? Math.min(...r.map((x) => x.gross)) : null;
  };
  return (
    <>
      <section className="bg-brand-green text-brand-sand">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <p className="text-brand-sand/70 text-sm tracking-[0.2em] uppercase">Precios</p>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl">Precios claros, sin sorpresas</h1>
          <p className="text-brand-sand/85 mt-4 max-w-2xl text-lg">
            Alquiler del local completo, con IGV. El precio exacto depende de la fecha, el horario y
            el número de invitados: consúltalo en segundos.
          </p>
        </div>
      </section>
      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <PolicyStrip info={info} />
        </div>
      </div>
      {SEGMENTS.map((s) => (
        <Section key={s.slug} title={s.nav} tone={s.slug === "corporativo" ? "sand" : "plain"}>
          <div className="overflow-x-auto">
            <table className="bg-card w-full min-w-[32rem] rounded-xl border text-sm">
              <caption className="sr-only">Precios desde, con IGV: {s.nav}</caption>
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="p-3 font-normal">Día</th>
                  <th className="p-3 text-right font-normal">Temporada baja</th>
                  <th className="p-3 text-right font-normal">Temporada alta (dic–mar)</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {DAYS.map(([d, label]) => {
                  const low = cell(s.eventType, d, "low");
                  const high = cell(s.eventType, d, "high");
                  if (low === null && high === null) return null;
                  return (
                    <tr key={d} className="border-b last:border-0">
                      <th scope="row" className="p-3 text-left font-medium">
                        {label}
                      </th>
                      <td className="p-3 text-right">
                        {low !== null ? `desde ${formatPEN(low)}` : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {high !== null ? `desde ${formatPEN(high)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            {info.guaranteeAmounts[s.eventType]
              ? `Garantía reembolsable de ${formatPEN(info.guaranteeAmounts[s.eventType]!)}. `
              : ""}
            <Link href={`/${s.slug}#cotizar`} className="underline">
              Consultar mi fecha para {s.nav.toLowerCase()}
            </Link>
          </p>
        </Section>
      ))}
      <CtaBand
        title="¿Ya tienes fecha?"
        text="Consulta disponibilidad y el precio exacto en segundos."
      />
    </>
  );
}
