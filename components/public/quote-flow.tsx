"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowLeft, CalendarCheck2, CalendarX2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { formatDate, formatPEN, type EventType } from "@/lib/domain";
import { track } from "@/lib/tracking";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { checkQuote, type CheckQuoteResult } from "@/server/public/actions";

// El formulario de datos se carga recién en el paso 2 (no pesa en la carga inicial)
const LeadForm = dynamic(() => import("./lead-form").then((m) => m.LeadForm), {
  loading: () => <div className="bg-muted h-64 animate-pulse rounded-lg" aria-hidden />,
});

const noop = () => () => {};
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const longDate = (d: string) => `${DOW[new Date(`${d}T12:00:00Z`).getUTCDay()]} ${formatDate(d)}`;

/**
 * Flujo único de cotización (OASIS.md §6.1): tipo, fecha e invitados → disponibilidad, fechas
 * libres cercanas y rango referencial → datos de contacto con todo ya cargado.
 */
export function QuoteFlow({
  defaultEventType = "wedding",
  defaultGuests = 80,
  form,
}: {
  defaultEventType?: EventType;
  defaultGuests?: number;
  form: string;
}) {
  const [eventType, setEventType] = useState<EventType>(defaultEventType);
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(String(defaultGuests));
  const [result, setResult] = useState<(CheckQuoteResult & { ok: true }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, start] = useTransition();
  // true solo en el cliente ya hidratado (señal para tests y para no perder lo escrito)
  const ready = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  const run = (d = date) =>
    start(async () => {
      setError(null);
      const res = await checkQuote({ eventType, date: d, guests: Number(guests) });
      if (!res.ok) {
        setResult(null);
        return setError(res.error);
      }
      setResult(res);
      track("availability_check", { date: d, available: res.available ? 1 : 0 });
      if (res.range)
        track("quote_view", { event_type: eventType, min: res.range.min, max: res.range.max });
    });

  if (step === 2) {
    return (
      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-muted-foreground flex w-fit items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Cambiar datos
        </button>
        <p className="bg-secondary rounded-lg p-3 text-sm">
          {EVENT_TYPE_LABEL[eventType]}
          {date && result?.available ? ` · ${longDate(date)}` : ""} · {guests} invitados
        </p>
        <LeadForm
          form={form}
          fixed={{
            eventType,
            date: result?.available ? date : undefined,
            guests: Number(guests) || undefined,
          }}
          submitLabel={result?.available ? "Quiero esta fecha" : "Solicitar cotización"}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <form
        aria-label="Consultar fecha y precio"
        data-ready={ready ? "" : undefined}
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`qf-type-${form}`}>Tipo de evento</Label>
            <NativeSelect
              id={`qf-type-${form}`}
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value as EventType);
                setResult(null);
              }}
            >
              {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((k) => (
                <option key={k} value={k}>
                  {EVENT_TYPE_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`qf-date-${form}`}>Fecha</Label>
            <Input
              id={`qf-date-${form}`}
              type="date"
              required
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setResult(null);
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`qf-guests-${form}`}>Invitados</Label>
            <Input
              id={`qf-guests-${form}`}
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              required
              value={guests}
              onChange={(e) => {
                setGuests(e.target.value);
                setResult(null);
              }}
            />
          </div>
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Consultando…" : "Ver disponibilidad y precio"}
        </Button>
      </form>

      <div aria-live="polite" className="grid gap-3 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {result && result.available && (
          <div className="bg-secondary grid gap-2 rounded-lg p-4">
            <p className="text-brand-green dark:text-brand-sand flex items-center gap-2 font-medium">
              <CalendarCheck2 className="size-4" aria-hidden /> ¡El {longDate(date)} está libre!
            </p>
            {result.range ? (
              <>
                <p>
                  Alquiler del espacio, rango referencial con IGV:{" "}
                  <strong className="font-display text-lg">
                    {formatPEN(result.range.min)} – {formatPEN(result.range.max)}
                  </strong>
                </p>
                {result.range.promotion && (
                  <p className="flex items-center gap-1.5 font-medium">
                    <Tag className="size-4" aria-hidden /> Incluye la promoción «
                    {result.range.promotion.name}» (−{result.range.promotion.discountPct} %)
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                {result.customQuote
                  ? "Para ese aforo preparamos una cotización a medida."
                  : "Te enviamos la cotización exacta en minutos."}
              </p>
            )}
            <Button type="button" onClick={() => setStep(2)} className="mt-1 w-full sm:w-fit">
              Separar o cotizar esta fecha
            </Button>
          </div>
        )}
        {result && !result.available && (
          <div className="grid gap-2 rounded-lg border p-4">
            <p className="flex items-center gap-2">
              <CalendarX2 className="size-4" aria-hidden /> El {longDate(date)} no está disponible.
            </p>
            {result.alternatives.length > 0 && (
              <>
                <p className="text-muted-foreground">Fechas libres cercanas:</p>
                <div className="flex flex-wrap gap-2">
                  {result.alternatives.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDate(d);
                        run(d);
                      }}
                      className="hover:bg-secondary rounded-full border px-3 py-1.5"
                    >
                      {longDate(d)}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button type="button" onClick={() => setStep(2)} className="w-fit text-sm underline">
              Prefiero que me contacten
            </button>
          </div>
        )}
        {!result && !error && (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="text-muted-foreground w-fit text-xs underline"
          >
            ¿Aún sin fecha? Déjanos tus datos y te asesoramos
          </button>
        )}
      </div>
    </div>
  );
}
