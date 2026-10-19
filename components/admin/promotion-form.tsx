"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPromotion, type PromoResult } from "@/app/admin/promociones/actions";

const EVENT_TYPES = [
  ["wedding", "Boda"],
  ["social", "Social"],
  ["corporate", "Corporativo"],
  ["family_day", "Full day familiar"],
] as const;
const DAY_TYPES = [
  ["mon_thu", "Lunes a jueves"],
  ["fri", "Viernes"],
  ["sat", "Sábado"],
  ["sun_holiday", "Domingo y feriados"],
] as const;

export function PromotionForm({ capPct }: { capPct: number }) {
  const [state, action, pending] = useActionState<PromoResult | null, FormData>(
    createPromotion,
    null,
  );
  return (
    <form action={action} aria-label="Nueva promoción" className="grid gap-3 sm:grid-cols-4">
      <div className="grid gap-1 sm:col-span-2">
        <Label htmlFor="p-name">Nombre</Label>
        <Input
          id="p-name"
          name="name"
          required
          maxLength={80}
          placeholder="Corporativo L-J verano"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="p-from">Desde</Label>
        <Input id="p-from" name="startsOn" type="date" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="p-to">Hasta</Label>
        <Input id="p-to" name="endsOn" type="date" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="p-pct">Descuento % (tope {capPct} %)</Label>
        <Input
          id="p-pct"
          name="discountPct"
          type="number"
          min="1"
          max={capPct}
          step="0.5"
          required
        />
      </div>
      <fieldset className="grid gap-1 text-sm sm:col-span-1">
        <legend className="mb-1 font-medium">Segmentos (vacío = todos)</legend>
        {EVENT_TYPES.map(([v, l]) => (
          <label key={v} className="flex items-center gap-2">
            <input type="checkbox" name="eventTypes" value={v} /> {l}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-1 text-sm sm:col-span-2">
        <legend className="mb-1 font-medium">Días (vacío = todos)</legend>
        {DAY_TYPES.map(([v, l]) => (
          <label key={v} className="flex items-center gap-2">
            <input type="checkbox" name="dayTypes" value={v} /> {l}
          </label>
        ))}
      </fieldset>
      <div className="flex items-center gap-3 sm:col-span-4">
        <Button type="submit" disabled={pending}>
          Crear promoción
        </Button>
        {state && (
          <p
            role="status"
            className={`text-sm ${state.ok ? "text-brand-olive dark:text-brand-camel" : "text-destructive"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
