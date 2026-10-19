import type { Metadata } from "next";
import Link from "next/link";
import { Check, FileText } from "lucide-react";
import { BASE } from "@/components/brand-site/brand-header";
import { ExampleBadge } from "@/components/brand-site/cards";
import { Section } from "@/components/public/sections";
import { formatDate, formatPEN } from "@/lib/domain";
import { fromNet } from "@/lib/domain/money";
import { igvRate, requirePreview } from "@/server/brand-preview";

export const metadata: Metadata = { title: "Mi cuenta" };

const STEPS = ["Pre-reserva", "Separada", "Confirmada", "Realizada"] as const;

/** Diseño de "Mi cuenta" (F2) con una reserva de EJEMPLO: no hay cuentas de cliente todavía. */
export default async function Account() {
  await requirePreview();
  const rate = await igvRate();
  const rent = fromNet(5200, rate);
  const deposit = Math.round(rent.gross * 50) / 100;
  const current = 1;
  return (
    <Section title="Mi cuenta" lead="Tus reservas, pagos y documentos en un solo lugar.">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="bg-card grid content-start gap-3 rounded-2xl border p-5">
          <p className="font-medium">Ingresa para ver tus reservas</p>
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium text-[#1f1f1f] disabled:opacity-70"
          >
            Continuar con Google
          </button>
          <p className="text-muted-foreground text-xs">
            También con tu correo. Solo ves las reservas hechas con tu correo verificado.
          </p>
        </aside>

        <article
          className="bg-card grid gap-5 rounded-2xl border p-5"
          aria-label="Reserva de ejemplo"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-xs">Reserva OP-2027-014</p>
              <h3 className="font-display text-2xl">Boda · {formatDate("2027-02-13")}</h3>
              <p className="text-muted-foreground text-sm">Oasis Pachacámac · Día completo</p>
            </div>
            <ExampleBadge />
          </div>

          <ol className="grid grid-cols-4 gap-2" aria-label="Estado de la reserva">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className="grid gap-1 text-center text-xs"
                aria-current={i === current ? "step" : undefined}
              >
                <span
                  className={`mx-auto grid size-7 place-items-center rounded-full border ${i <= current ? "bg-primary text-primary-foreground border-transparent" : ""}`}
                >
                  {i < current ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <span className={i === current ? "font-medium" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ol>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-xs">Adelanto (50 %)</p>
              <p className="text-xl font-semibold tabular-nums">{formatPEN(deposit)}</p>
              <p className="text-primary text-sm">Pagado</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-xs">
                Saldo · vence el {formatDate("2027-01-29")}
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {formatPEN(rent.gross - deposit)}
              </p>
              <Link
                href={`${BASE}/pagar`}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex rounded-md px-4 py-2 text-sm font-medium"
              >
                Pagar saldo
              </Link>
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium">Documentos</p>
            <ul className="grid gap-2 text-sm">
              {["Contrato de alquiler", "Cotización v2", "Comprobante del adelanto"].map((d) => (
                <li key={d} className="flex items-center gap-2">
                  <FileText className="text-muted-foreground size-4" aria-hidden /> {d}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            Datos de ejemplo para ver el diseño. Montos con IGV ({Math.round(rate * 100)} %, de
            Configuración).
          </p>
        </article>
      </div>
    </Section>
  );
}
