import type { Metadata } from "next";
import { CreditCard, Lock, Smartphone } from "lucide-react";
import { ExampleBadge } from "@/components/brand-site/cards";
import { Section } from "@/components/public/sections";
import { formatDate, formatPEN } from "@/lib/domain";
import { fromGross, fromNet } from "@/lib/domain/money";
import { igvRate, requirePreview } from "@/server/brand-preview";

export const metadata: Metadata = { title: "Pagar" };

/** Diseño del pago en línea (F2). La pasarela se conecta cuando se elija el proveedor. */
export default async function Pay() {
  await requirePreview();
  const rate = await igvRate();
  const total = fromNet(5200, rate).gross;
  const due = fromGross(Math.round(total * 50) / 100, rate);
  return (
    <Section title="Pagar saldo" className="max-w-3xl">
      <div className="grid gap-6">
        <div className="bg-card grid gap-3 rounded-2xl border p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">Boda · {formatDate("2027-02-13")} · Oasis Pachacámac</p>
            <ExampleBadge />
          </div>
          <dl className="grid gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Saldo sin IGV</dt>
              <dd className="tabular-nums">{formatPEN(due.net)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">IGV ({Math.round(rate * 100)} %)</dt>
              <dd className="tabular-nums">{formatPEN(due.igv)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total a pagar</dt>
              <dd className="tabular-nums">{formatPEN(due.gross)}</dd>
            </div>
          </dl>
        </div>

        <fieldset className="grid gap-3">
          <legend className="mb-1 font-medium">Medio de pago</legend>
          {[
            {
              id: "tarjeta",
              icon: CreditCard,
              label: "Tarjeta de crédito o débito",
              hint: "Visa, Mastercard y otras",
            },
            {
              id: "yape",
              icon: Smartphone,
              label: "Yape",
              hint: "Con el código de aprobación de tu app",
            },
          ].map(({ id, icon: Icon, label, hint }, i) => (
            <label
              key={id}
              className="bg-card has-checked:border-primary flex cursor-pointer items-center gap-3 rounded-xl border p-4"
            >
              <input
                type="radio"
                name="metodo"
                value={id}
                defaultChecked={i === 0}
                className="accent-primary size-4"
              />
              <Icon className="text-brand-olive dark:text-brand-camel size-5" aria-hidden />
              <span>
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground block text-sm">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <button
          type="button"
          disabled
          className="bg-primary text-primary-foreground h-12 rounded-md font-medium disabled:opacity-60"
        >
          Pagar {formatPEN(due.gross)}
        </button>
        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Pago procesado por la pasarela (por elegir). No guardamos los datos de tu tarjeta. Al
          confirmarse, tu reserva se actualiza sola y te llega el comprobante por correo.
        </p>
      </div>
    </Section>
  );
}
