"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { formatPEN, type EventType } from "@/lib/domain";
import { track } from "@/lib/tracking";
import { estimateQuote, type QuoteResult } from "@/server/public/actions";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";

export function QuoteWidget({ defaultEventType = "wedding" }: { defaultEventType?: EventType }) {
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [pending, start] = useTransition();

  const submit = (formData: FormData) =>
    start(async () => {
      const res = await estimateQuote({
        eventType: String(formData.get("eventType")) as EventType,
        date: String(formData.get("date")),
        guests: Number(formData.get("guests")),
      });
      setResult(res);
      if (res.ok)
        track("quote_view", {
          event_type: String(formData.get("eventType")),
          min: res.min,
          max: res.max,
        });
    });

  return (
    <form action={submit} className="grid gap-4" aria-label="Cotizador rápido">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="q-type">Tipo de evento</Label>
          <NativeSelect id="q-type" name="eventType" defaultValue={defaultEventType}>
            {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((k) => (
              <option key={k} value={k}>
                {EVENT_TYPE_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="q-date">Fecha</Label>
          <Input id="q-date" name="date" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="q-guests">Invitados</Label>
          <Input
            id="q-guests"
            name="guests"
            type="number"
            min={1}
            max={500}
            inputMode="numeric"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Calculando…" : "Ver rango estimado"}
      </Button>
      <div aria-live="polite">
        {result?.ok && (
          <div className="bg-secondary rounded-lg p-4">
            <p className="text-muted-foreground text-sm">
              Alquiler del espacio, rango estimado (incluye IGV)
            </p>
            <p className="font-display text-brand-green dark:text-brand-sand text-3xl">
              {formatPEN(result.min)} – {formatPEN(result.max)}
            </p>
            {result.promotion && (
              <p className="mt-1 text-sm font-medium">
                Incluye la promoción «{result.promotion.name}» (−{result.promotion.discountPct} %)
              </p>
            )}
            <p className="text-muted-foreground mt-2 text-xs">
              Referencial: la cotización final depende del horario y los servicios. Para separar la
              fecha se paga un adelanto; la garantía es reembolsable.
            </p>
          </div>
        )}
        {result && !result.ok && <p className="text-muted-foreground text-sm">{result.error}</p>}
      </div>
    </form>
  );
}
