import { CalendarSearch } from "lucide-react";
import { SEGMENTS } from "@/lib/content/segments";
import { BASE } from "./brand-header";

/** Buscador de la marca: qué evento, qué fecha, cuántos. Formulario GET, sin JavaScript. */
export function SearchForm({
  defaults = {},
  min,
  base = BASE,
}: {
  defaults?: { tipo?: string; fecha?: string; invitados?: string };
  min: string;
  base?: string;
}) {
  return (
    <form
      action={`${base}/buscar`}
      method="get"
      role="search"
      aria-label="Buscar locales y experiencias"
      className="bg-card text-foreground grid gap-3 rounded-2xl p-4 shadow-2xl sm:grid-cols-[1.2fr_1fr_0.7fr_auto] sm:items-end sm:p-5"
    >
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Tipo de evento</span>
        <select
          name="tipo"
          defaultValue={defaults.tipo ?? ""}
          className="bg-background h-11 rounded-md border px-3"
        >
          <option value="">Cualquiera</option>
          {SEGMENTS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.nav}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Fecha</span>
        <input
          type="date"
          name="fecha"
          min={min}
          defaultValue={defaults.fecha}
          className="bg-background h-11 rounded-md border px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Invitados</span>
        <input
          type="number"
          name="invitados"
          min={1}
          max={500}
          inputMode="numeric"
          defaultValue={defaults.invitados}
          placeholder="80"
          className="bg-background h-11 rounded-md border px-3"
        />
      </label>
      <button
        type="submit"
        className="bg-brand-camel inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 font-medium text-[#2a2418] hover:opacity-90"
      >
        <CalendarSearch className="size-4" aria-hidden /> Buscar
      </button>
    </form>
  );
}
