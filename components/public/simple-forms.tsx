"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  submitComplaint,
  submitPlannerApplication,
  type ComplaintState,
  type LeadState,
} from "@/server/public/actions";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

function Privacy({ error }: { error?: string }) {
  return (
    <div className="grid gap-1 text-sm">
      <label className="flex items-start gap-2">
        <input type="checkbox" name="privacy" required className="mt-1" />
        <span>
          Acepto el{" "}
          <Link href="/privacidad" className="underline">
            aviso de privacidad
          </Link>
          .
        </span>
      </label>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

export function PlannerApplicationForm() {
  const [state, action, pending] = useActionState<LeadState, FormData>(
    submitPlannerApplication,
    {},
  );
  if (state.ok) {
    return (
      <p role="status" className="bg-secondary flex gap-2 rounded-xl p-5">
        <CheckCircle2 className="text-brand-green size-5" aria-hidden /> Recibimos tu solicitud. Te
        contactaremos para coordinar una visita técnica e invitarte al portal.
      </p>
    );
  }
  const e = state.fieldErrors ?? {};
  return (
    <form
      action={action}
      className="grid gap-4"
      aria-label="Solicitud de alta de planner"
      noValidate
    >
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="businessName" label="Marca o empresa" error={e.businessName}>
          <Input id="businessName" name="businessName" required />
        </Field>
        <Field id="contactName" label="Tu nombre" error={e.contactName}>
          <Input id="contactName" name="contactName" autoComplete="name" required />
        </Field>
        <Field id="p-email" label="Correo" error={e.email}>
          <Input id="p-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="p-phone" label="Celular / WhatsApp" error={e.phone}>
          <Input id="p-phone" name="phone" type="tel" autoComplete="tel" required />
        </Field>
        <Field id="instagram" label="Instagram o web (opcional)">
          <Input id="instagram" name="instagram" />
        </Field>
        <Field id="eventsPerYear" label="Eventos al año (aprox.)">
          <Input
            id="eventsPerYear"
            name="eventsPerYear"
            type="number"
            min={0}
            inputMode="numeric"
          />
        </Field>
      </div>
      <Field id="p-message" label="Cuéntanos de tu trabajo (opcional)">
        <Textarea id="p-message" name="message" rows={3} />
      </Field>
      <Privacy error={e.privacy} />
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando…" : "Quiero ser planner aliada"}
      </Button>
    </form>
  );
}

export function ComplaintForm() {
  const [state, action, pending] = useActionState<ComplaintState, FormData>(submitComplaint, {});
  if (state.ok && state.code) {
    return (
      <div role="status" className="bg-secondary grid gap-2 rounded-xl p-5">
        <p className="flex gap-2 font-medium">
          <CheckCircle2 className="text-brand-green size-5" aria-hidden /> Registramos tu hoja de
          reclamación.
        </p>
        <p>
          Código: <strong className="font-mono">{state.code}</strong>. Guárdalo: te responderemos al
          correo indicado dentro del plazo legal.
        </p>
      </div>
    );
  }
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" aria-label="Hoja de reclamación" noValidate>
      <Honeypot />
      <fieldset className="grid gap-4 rounded-xl border p-4">
        <legend className="px-1 font-medium">1. Identificación del consumidor</legend>
        <Field id="fullName" label="Nombre completo" error={e.fullName}>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="documentType" label="Documento">
            <NativeSelect id="documentType" name="documentType" defaultValue="DNI">
              <option value="DNI">DNI</option>
              <option value="CE">Carné de extranjería</option>
              <option value="PASAPORTE">Pasaporte</option>
              <option value="RUC">RUC</option>
            </NativeSelect>
          </Field>
          <Field id="documentNumber" label="Número de documento" error={e.documentNumber}>
            <Input id="documentNumber" name="documentNumber" required />
          </Field>
        </div>
        <Field id="address" label="Domicilio" error={e.address}>
          <Input id="address" name="address" autoComplete="street-address" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="c-phone" label="Teléfono">
            <Input id="c-phone" name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field id="c-email" label="Correo" error={e.email}>
            <Input id="c-email" name="email" type="email" autoComplete="email" required />
          </Field>
        </div>
        <Field id="guardianName" label="Padre, madre o apoderado (si eres menor de edad)">
          <Input id="guardianName" name="guardianName" />
        </Field>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border p-4">
        <legend className="px-1 font-medium">2. Bien contratado</legend>
        <Field id="serviceDescription" label="Servicio" error={e.serviceDescription}>
          <Input
            id="serviceDescription"
            name="serviceDescription"
            placeholder="Ej. alquiler del local para evento"
            required
          />
        </Field>
        <Field id="amount" label="Monto reclamado (S/, opcional)">
          <Input id="amount" name="amount" type="number" min={0} step="0.01" inputMode="decimal" />
        </Field>
      </fieldset>
      <fieldset className="grid gap-4 rounded-xl border p-4">
        <legend className="px-1 font-medium">3. Detalle</legend>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="kind" value="reclamo" defaultChecked /> Reclamo
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="kind" value="queja" /> Queja
          </label>
        </div>
        <p className="text-muted-foreground text-xs">
          Reclamo: disconformidad con el servicio contratado. Queja: malestar por la atención, no
          relacionado con el servicio.
        </p>
        <Field id="detail" label="¿Qué ocurrió?" error={e.detail}>
          <Textarea id="detail" name="detail" rows={4} required />
        </Field>
        <Field id="request" label="¿Qué solicitas?" error={e.request}>
          <Textarea id="request" name="request" rows={3} required />
        </Field>
      </fieldset>
      <Privacy error={e.privacy} />
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Registrando…" : "Registrar hoja de reclamación"}
      </Button>
    </form>
  );
}
