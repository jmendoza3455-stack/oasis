"use client";

import { useActionState, useEffect, useMemo } from "react";
import Link from "next/link";
import Script from "next/script";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EventType } from "@/lib/domain";
import { ATTRIBUTION_KEYS, ATTRIBUTION_STORAGE_KEY, parseAttribution, track } from "@/lib/tracking";
import { useStored } from "@/lib/use-stored";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { submitLead, type LeadState } from "@/server/public/actions";

const TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LeadForm({
  defaultEventType = "wedding",
  defaultDate,
  form = "general",
  fixed,
  submitLabel = "Solicitar cotización",
}: {
  defaultEventType?: EventType;
  defaultDate?: string;
  form?: string;
  /** Datos ya elegidos en el flujo de cotización: se envían ocultos, sin volver a pedirlos. */
  fixed?: { eventType: EventType; date?: string; guests?: number };
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, {});
  const raw = useStored(ATTRIBUTION_STORAGE_KEY);
  const attribution = useMemo(() => parseAttribution(raw), [raw]);
  useEffect(() => {
    if (state.ok) track("lead_submit", { form, campaign: attribution.utm_campaign });
  }, [state.ok, form, attribution.utm_campaign]);

  if (state.ok) {
    return (
      <div role="status" className="bg-secondary flex items-start gap-3 rounded-xl p-5">
        <CheckCircle2
          className="text-brand-green dark:text-brand-sand mt-0.5 size-5 shrink-0"
          aria-hidden
        />
        <div>
          <p className="font-medium">¡Gracias! Recibimos tu consulta.</p>
          <p className="text-muted-foreground text-sm">
            Te escribimos muy pronto con la disponibilidad y la cotización.
          </p>
        </div>
      </div>
    );
  }

  const err = (k: string) => state.fieldErrors?.[k];
  const field = (id: string, label: string, input: React.ReactNode) => (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {err(id) && (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {err(id)}
        </p>
      )}
    </div>
  );

  return (
    <form action={action} className="grid gap-4" aria-label="Solicitar cotización" noValidate>
      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          No llenar <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {ATTRIBUTION_KEYS.map((k) => (
        <input key={k} type="hidden" name={k} value={attribution[k] ?? ""} />
      ))}
      <input type="hidden" name="landing_path" value={attribution.landing_path ?? ""} />
      <input type="hidden" name="referrer" value={attribution.referrer ?? ""} />
      <input type="hidden" name="form" value={form} />

      {field(
        "fullName",
        "Nombre",
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          aria-invalid={!!err("fullName")}
        />,
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "phone",
          "Celular / WhatsApp",
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            aria-invalid={!!err("phone")}
          />,
        )}
        {field(
          "email",
          "Correo",
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!err("email")}
          />,
        )}
      </div>
      {fixed ? (
        <>
          <input type="hidden" name="eventType" value={fixed.eventType} />
          <input type="hidden" name="eventDate" value={fixed.date ?? ""} />
          <input type="hidden" name="guests" value={fixed.guests ?? ""} />
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {field(
            "eventType",
            "Tipo de evento",
            <NativeSelect id="eventType" name="eventType" defaultValue={defaultEventType}>
              {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((k) => (
                <option key={k} value={k}>
                  {EVENT_TYPE_LABEL[k]}
                </option>
              ))}
            </NativeSelect>,
          )}
          {field(
            "eventDate",
            "Fecha tentativa",
            <Input id="eventDate" name="eventDate" type="date" defaultValue={defaultDate} />,
          )}
          {field(
            "guests",
            "Invitados",
            <Input id="guests" name="guests" type="number" min={1} max={500} inputMode="numeric" />,
          )}
        </div>
      )}
      {field(
        "message",
        "Cuéntanos de tu evento (opcional)",
        <Textarea id="message" name="message" rows={3} />,
      )}

      <div className="grid gap-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="privacy" required className="mt-1" />
          <span>
            Acepto el{" "}
            <Link href="/privacidad" className="underline">
              aviso de privacidad
            </Link>{" "}
            y que me contacten sobre mi consulta.
          </span>
        </label>
        {err("privacy") && <p className="text-destructive text-xs">{err("privacy")}</p>}
        <label className="text-muted-foreground flex items-start gap-2">
          <input type="checkbox" name="marketing" className="mt-1" />
          <span>Quiero recibir novedades y promociones (opcional).</span>
        </label>
      </div>

      {TURNSTILE && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={TURNSTILE} data-language="es" />
        </>
      )}

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando…" : submitLabel}
      </Button>
    </form>
  );
}
