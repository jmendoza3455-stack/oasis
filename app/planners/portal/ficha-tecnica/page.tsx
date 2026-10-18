import type { Metadata } from "next";
import { Suspense } from "react";
import { PrintButton } from "@/components/portal/print-button";
import { withDb } from "@/lib/db";
import { activePlannerContext } from "@/server/queries/planner";

export const metadata: Metadata = { title: "Ficha técnica" };

async function Sheet() {
  const ctx = await activePlannerContext();
  const { spaces, s } = await withDb({ kind: "user", userId: ctx.user.id }, async (sql) => {
    const spaces = await sql<{ name: string; capacity: number | null; placeholder: boolean }>(
      `select name, capacity, is_placeholder as placeholder from spaces where venue_id = $1 order by sort_order`,
      [ctx.venue.id],
    );
    const rows = await sql<{ key: string; value: unknown }>(
      `select key, value from settings where venue_id = $1`,
      [ctx.venue.id],
    );
    return {
      spaces,
      s: Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>,
    };
  });
  const cap = (s.capacity ?? {}) as { cocktail?: number; banquet?: number; full_day?: number };
  const hours = (s.slot_hours ?? {}) as { full_day?: [string, string]; night?: [string, string] };
  return (
    <div className="bg-card grid gap-6 rounded-xl border p-6">
      <section>
        <h2 className="font-display text-2xl">Espacios</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {spaces.map((sp) => (
            <li key={sp.name}>
              {sp.name}
              {sp.capacity ? ` · hasta ${sp.capacity} personas` : ""}
              {sp.placeholder && <span className="text-muted-foreground"> (dato pendiente)</span>}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl">Aforo</h2>
        <p className="text-sm">
          Cóctel: {cap.cocktail ?? "—"} · Banquete sentado: {cap.banquet ?? "—"} · Full day:{" "}
          {cap.full_day ?? "—"}
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Horarios</h2>
        <p className="text-sm">
          Full day: {hours.full_day?.join(" a ") ?? "—"} · Evento noche:{" "}
          {hours.night?.join(" a ") ?? "—"} · Pernocte opcional. Un evento por día.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Reglas para proveedores</h2>
        <ul className="list-disc pl-5 text-sm">
          <li>
            Proveedores externos permitidos (catering, música, decoración) con estándares de
            seguridad y cuidado del local.
          </li>
          <li>Garantía reembolsable por daños; se devuelve después del evento.</li>
          <li>El reglamento completo de uso se entrega con el contrato.</li>
        </ul>
      </section>
      <p className="text-muted-foreground text-xs">
        Datos sujetos a confirmación antes de la reapertura.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Ficha técnica · Oasis Pachacámac</h1>
        <PrintButton />
      </div>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Sheet />
      </Suspense>
    </div>
  );
}
