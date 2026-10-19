"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { ATTRIBUTION_COOKIE, parseAttributionCookie } from "@/lib/attribution-cookie";
import { withDb } from "@/lib/db";
import { bestPromotion, estimateRange, PricingError } from "@/lib/domain";
import { loadPricingContext } from "@/server/pricing-context";
import { activeVenue } from "@/server/venue";
import { verifyTurnstile, withinRateLimit } from "./antispam";
import { createLead } from "./leads";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha.");
const eventType = z.enum(["wedding", "social", "corporate", "family_day"]);

function todayLima() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

// ---------------------------------------------------------------------------
// Cotizador: tipo de evento, fecha e invitados
// ---------------------------------------------------------------------------
const quoteSchema = z.object({
  eventType,
  date: isoDate,
  guests: z.coerce.number().int().min(1, "Indica el número de invitados.").max(500),
});

// ---------------------------------------------------------------------------
// Flujo único: disponibilidad + fechas libres cercanas + rango (si los precios son públicos)
// ---------------------------------------------------------------------------
export type CheckQuoteResult =
  | {
      ok: true;
      available: boolean;
      alternatives: string[];
      range: {
        min: number;
        max: number;
        promotion: { name: string; discountPct: number } | null;
      } | null;
      customQuote: boolean;
    }
  | { ok: false; error: string };

export async function checkQuote(input: z.input<typeof quoteSchema>): Promise<CheckQuoteResult> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.date < todayLima()) return { ok: false, error: "Elige una fecha futura." };
  if (!(await withinRateLimit("availability", 60))) {
    return { ok: false, error: "Demasiadas consultas. Intenta en unos minutos." };
  }
  const venue = await activeVenue();
  const { available, alternatives } = await withDb({ kind: "anon" }, async (sql) => {
    const [row] = await sql<{ ok: boolean }>(`select public.is_date_available($1, $2) as ok`, [
      venue.slug,
      parsed.data.date,
    ]);
    // Si está ocupada: hasta 4 fechas libres más cercanas (±30 días), sin datos de terceros
    const alt = row.ok
      ? []
      : await sql<{ d: string }>(
          `select to_char(d, 'YYYY-MM-DD') as d
             from generate_series($2::date - 30, $2::date + 30, interval '1 day') d
            where d::date >= (now() at time zone 'America/Lima')::date and d::date <> $2::date
              and public.is_date_available($1, d::date)
            order by abs(d::date - $2::date), d limit 4`,
          [venue.slug, parsed.data.date],
        );
    return { available: row.ok, alternatives: alt.map((a) => a.d) };
  });
  const ctx = await loadPricingContext(venue.id);
  if (!ctx.publicPricesEnabled)
    return { ok: true, available, alternatives, range: null, customQuote: false };
  try {
    const promotion = bestPromotion(ctx.promotions, parsed.data, ctx.holidays);
    const r = estimateRange(ctx.cards, { ...parsed.data, promotion }, ctx.holidays, ctx.settings);
    return {
      ok: true,
      available,
      alternatives,
      range: {
        min: r.min,
        max: r.max,
        promotion: r.base.promotion
          ? { name: r.base.promotion.name, discountPct: r.base.discountPct }
          : null,
      },
      customQuote: false,
    };
  } catch (error) {
    if (error instanceof PricingError && error.code === "no_rate_card") {
      return { ok: true, available, alternatives, range: null, customQuote: true };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Lead con UTM de punta a punta y atribución al planner (90 días)
// ---------------------------------------------------------------------------
const optional = (s: z.ZodString) => s.optional().transform((v) => (v ? v : undefined));

const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  phone: z.string().trim().min(7, "Escribe un teléfono válido.").max(20),
  email: z.email("Escribe un correo válido."),
  eventType,
  eventDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
  guests: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: optional(z.string().trim().max(1000)),
  privacy: z.literal("on", { error: "Debes aceptar el aviso de privacidad." }),
  marketing: z.literal("on").optional(),
  utm_source: optional(z.string().max(100)),
  utm_medium: optional(z.string().max(100)),
  utm_campaign: optional(z.string().max(150)),
  utm_content: optional(z.string().max(150)),
  utm_term: optional(z.string().max(150)),
  gclid: optional(z.string().max(300)),
  fbclid: optional(z.string().max(300)),
  landing_path: optional(z.string().max(300)),
  referrer: optional(z.string().max(500)),
  form: optional(z.string().max(40)),
});

export type LeadState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function submitLead(_: LeadState, formData: FormData): Promise<LeadState> {
  // Honeypot: los bots llenan el campo oculto "website"
  if (formData.get("website")) return { ok: true };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response") as string | null))) {
    return { error: "No pudimos verificar que no eres un robot. Recarga la página." };
  }
  if (!(await withinRateLimit("lead", 5))) {
    return { error: "Recibimos varias solicitudes seguidas. Intenta en unos minutos." };
  }

  // Respaldo server-side de la atribución (cookie del proxy) si el formulario llegó sin UTM
  const fromCookie = parseAttributionCookie((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  const raw = Object.fromEntries(formData) as Record<string, FormDataEntryValue>;
  if (!raw.utm_source && !raw.utm_campaign && !raw.gclid && !raw.fbclid) {
    for (const [k, v] of Object.entries(fromCookie)) if (v) raw[k] = v;
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
    );
    return { error: "Revisa los campos marcados.", fieldErrors };
  }
  const d = parsed.data;
  await createLead(
    {
      ...d,
      marketing: d.marketing === "on",
      sourceForm: d.form ?? null,
    },
    { kind: "service", actorName: "web" },
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Solicitud de alta de planner
// ---------------------------------------------------------------------------
const plannerSchema = z.object({
  businessName: z.string().trim().min(2, "Escribe el nombre de tu marca o empresa.").max(120),
  contactName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  email: z.email("Escribe un correo válido."),
  phone: z.string().trim().min(7, "Escribe un teléfono válido.").max(20),
  instagram: optional(z.string().trim().max(100)),
  eventsPerYear: z.coerce
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: optional(z.string().trim().max(1000)),
  privacy: z.literal("on", { error: "Debes aceptar el aviso de privacidad." }),
});

export async function submitPlannerApplication(
  _: LeadState,
  formData: FormData,
): Promise<LeadState> {
  if (formData.get("website")) return { ok: true };
  if (!(await withinRateLimit("planner_app", 3))) return { error: "Intenta en unos minutos." };
  const parsed = plannerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Revisa los campos marcados.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
    };
  }
  const d = parsed.data;
  await withDb({ kind: "service", actorName: "web" }, (sql) =>
    sql(
      `insert into planner_applications (business_name, contact_name, email, phone, instagram, events_per_year, message)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        d.businessName,
        d.contactName,
        d.email,
        d.phone,
        d.instagram ?? null,
        d.eventsPerYear ?? null,
        d.message ?? null,
      ],
    ),
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Libro de Reclamaciones
// ---------------------------------------------------------------------------
const complaintSchema = z.object({
  kind: z.enum(["reclamo", "queja"]),
  fullName: z.string().trim().min(3, "Escribe tu nombre completo.").max(150),
  documentType: z.enum(["DNI", "CE", "PASAPORTE", "RUC"]),
  documentNumber: z.string().trim().min(6, "Escribe tu número de documento.").max(20),
  address: z.string().trim().min(5, "Escribe tu domicilio.").max(250),
  phone: optional(z.string().trim().max(20)),
  email: z.email("Escribe un correo válido."),
  guardianName: optional(z.string().trim().max(150)),
  serviceDescription: z.string().trim().min(3, "Describe el servicio contratado.").max(500),
  amount: z.coerce
    .number()
    .min(0)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  detail: z.string().trim().min(10, "Detalla lo ocurrido.").max(3000),
  request: z.string().trim().min(5, "Indica tu pedido.").max(2000),
  privacy: z.literal("on", { error: "Debes aceptar el aviso de privacidad." }),
});

export type ComplaintState = LeadState & { code?: string };

export async function submitComplaint(
  _: ComplaintState,
  formData: FormData,
): Promise<ComplaintState> {
  if (formData.get("website")) return { ok: true };
  if (!(await withinRateLimit("complaint", 3))) return { error: "Intenta en unos minutos." };
  const parsed = complaintSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Revisa los campos marcados.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
    };
  }
  const d = parsed.data;
  const venue = await activeVenue();
  const [row] = await withDb({ kind: "service", actorName: "web" }, (sql) =>
    sql<{ code: string }>(
      `insert into complaints (venue_id, code, kind, full_name, document_type, document_number, address, phone, email,
                               guardian_name, service_description, amount, detail, request)
       values ($1, '', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning code`,
      [
        venue.id,
        d.kind,
        d.fullName,
        d.documentType,
        d.documentNumber,
        d.address,
        d.phone ?? null,
        d.email,
        d.guardianName ?? null,
        d.serviceDescription,
        d.amount ?? null,
        d.detail,
        d.request,
      ],
    ),
  );
  return { ok: true, code: row.code };
}
