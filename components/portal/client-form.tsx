"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import type { EventType } from "@/lib/domain";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { registerClient, type ClientState } from "@/app/planners/portal/actions";

export function ClientForm() {
  const [state, action, pending] = useActionState<ClientState, FormData>(registerClient, {});
  const e = state.fieldErrors ?? {};
  const field = (id: string, label: string, input: React.ReactNode, key = id) => (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {e[key] && <p className="text-destructive text-xs">{e[key]}</p>}
    </div>
  );
  return (
    <form
      action={action}
      className="grid gap-4"
      aria-label="Registrar cliente"
      key={state.ok ? "sent" : "form"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "c-name",
          "Nombre del cliente",
          <Input id="c-name" name="fullName" required />,
          "fullName",
        )}
        {field(
          "c-phone",
          "Celular",
          <Input id="c-phone" name="phone" type="tel" required />,
          "phone",
        )}
        {field("c-email", "Correo", <Input id="c-email" name="email" type="email" />, "email")}
        {field(
          "c-ruc",
          "RUC (opcional)",
          <Input id="c-ruc" name="ruc" inputMode="numeric" />,
          "ruc",
        )}
        {field(
          "c-type",
          "Tipo de evento",
          <NativeSelect id="c-type" name="eventType" defaultValue="wedding">
            {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((k) => (
              <option key={k} value={k}>
                {EVENT_TYPE_LABEL[k]}
              </option>
            ))}
          </NativeSelect>,
          "eventType",
        )}
        <div className="grid grid-cols-2 gap-3">
          {field(
            "c-date",
            "Fecha tentativa",
            <Input id="c-date" name="eventDate" type="date" />,
            "eventDate",
          )}
          {field(
            "c-guests",
            "Invitados",
            <Input id="c-guests" name="guests" type="number" min={1} />,
            "guests",
          )}
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-1" required />
        <span>
          Tengo autorización de mi cliente para compartir sus datos con Oasis Pachacámac (Ley N.º
          29733).
        </span>
      </label>
      {e.consent && <p className="text-destructive text-xs">{e.consent}</p>}
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-brand-green text-sm">
          Cliente registrado. Queda protegido a tu nombre.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar cliente"}
      </Button>
    </form>
  );
}
