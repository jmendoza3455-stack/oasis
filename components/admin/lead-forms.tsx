"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EventType } from "@/lib/domain";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { addActivity, createBookingFromLead, type CrmResult } from "@/app/admin/crm/actions";

const KINDS = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  email: "Correo",
  visit: "Visita",
  note: "Nota",
  task: "Tarea",
};

export function ActivityForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<CrmResult | null, FormData>(addActivity, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="a-kind">Tipo</Label>
          <NativeSelect id="a-kind" name="kind" defaultValue="whatsapp">
            {Object.entries(KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="a-due">Próximo paso (opcional)</Label>
          <Input id="a-due" name="dueAt" type="datetime-local" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="a-notes">Notas</Label>
        <Textarea id="a-notes" name="notes" rows={2} />
      </div>
      {state && !state.ok && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" variant="outline" disabled={pending}>
        Registrar actividad
      </Button>
    </form>
  );
}

export function CreateBookingForm({
  leadId,
  eventType,
  eventDate,
  guests,
}: {
  leadId: string;
  eventType: EventType | null;
  eventDate: string | null;
  guests: number | null;
}) {
  const [state, action, pending] = useActionState<CrmResult | null, FormData>(
    createBookingFromLead,
    null,
  );
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="b-date">Fecha</Label>
          <Input id="b-date" name="eventDate" type="date" defaultValue={eventDate ?? ""} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="b-guests">Invitados</Label>
          <Input
            id="b-guests"
            name="guests"
            type="number"
            min={1}
            defaultValue={guests ?? ""}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="b-type">Tipo</Label>
          <NativeSelect id="b-type" name="eventType" defaultValue={eventType ?? "wedding"}>
            {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((k) => (
              <option key={k} value={k}>
                {EVENT_TYPE_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="b-discount">Descuento %</Label>
          <Input
            id="b-discount"
            name="discountPct"
            type="number"
            min={0}
            max={100}
            step="0.5"
            defaultValue={0}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        El precio sale del tarifario vigente. Queda como pre-reserva de 72 h.
      </p>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear pre-reserva"}
      </Button>
    </form>
  );
}
