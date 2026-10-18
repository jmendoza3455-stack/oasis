"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { dbErrorCode, withDb } from "@/lib/db";
import { addDays } from "@/lib/domain";
import { activePlannerContext, plannerContext } from "@/server/queries/planner";

export type PortalResult = { ok: true } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  date_taken: "Esa fecha ya no está disponible.",
  max_active_holds_reached:
    "Ya tienes el máximo de pre-reservas activas. Cancela una o espera a que venza.",
  agreement_not_accepted: "Primero acepta el contrato marco.",
  planner_not_active: "Tu cuenta de planner no está activa. Escríbenos.",
  client_not_owned: "Ese cliente no está registrado a tu nombre.",
  forbidden: "No tienes permiso para esta acción.",
  cancel_reason_required: "Indica el motivo.",
};
const message = (error: unknown) =>
  MESSAGES[dbErrorCode(error)] ?? "No se pudo completar la acción.";

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

export async function acceptAgreement() {
  const ctx = await plannerContext();
  const h = await headers();
  await withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
    sql(
      `insert into planner_agreements (planner_id, version, accepted_by, ip, user_agent)
       values ($1, $2, $3, $4::inet, $5) on conflict (planner_id, version) do nothing`,
      [
        ctx.user.plannerId,
        ctx.settings.agreementVersion,
        ctx.user.id,
        h.get("x-forwarded-for")?.split(",")[0].trim() || null,
        h.get("user-agent")?.slice(0, 300) ?? null,
      ],
    ),
  );
  redirect("/planners/portal");
}

const clientSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe el nombre del cliente.").max(120),
  phone: z.string().trim().min(7, "Escribe un teléfono válido.").max(20),
  email: z.email("Escribe un correo válido.").or(z.literal("")),
  ruc: z
    .string()
    .trim()
    .regex(/^((10|15|17|20)\d{9})?$/, "El RUC tiene 11 dígitos.")
    .optional(),
  eventType: z.enum(["wedding", "social", "corporate", "family_day"]),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal("")),
  guests: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .or(z.literal("").transform(() => undefined)),
  consent: z.literal("on", { error: "Confirma que tienes autorización del cliente." }),
});

export type ClientState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function registerClient(_: ClientState, formData: FormData): Promise<ClientState> {
  const ctx = await activePlannerContext();
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Revisa los campos marcados.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
    };
  }
  const d = parsed.data;
  try {
    await withDb({ kind: "user", userId: ctx.user.id }, async (sql) => {
      const [c] = await sql<{ id: string }>(
        `insert into clients (full_name, phone, email, ruc, created_by_planner_id, privacy_accepted_at)
         values ($1, $2, $3, $4, $5, now()) returning id`,
        [d.fullName, d.phone, d.email || null, d.ruc || null, ctx.user.plannerId],
      );
      await sql(
        `insert into leads (venue_id, client_id, planner_id, channel, stage, event_type, event_date, guests, protected_until, source_form)
         values ($1, $2, $3, 'planner', 'new', $4, $5, $6, $7, 'portal_planner')`,
        [
          ctx.venue.id,
          c.id,
          ctx.user.plannerId,
          d.eventType,
          d.eventDate || null,
          d.guests ?? null,
          addDays(today(), ctx.settings.protectionDays),
        ],
      );
    });
  } catch (error) {
    return { error: message(error) };
  }
  refresh();
  return { ok: true };
}

const holdSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientId: z.uuid({ error: "Elige un cliente." }),
  eventType: z.enum(["wedding", "social", "corporate", "family_day"]),
  guests: z.coerce.number().int().min(1, "Indica los invitados.").max(500),
});

export async function createHold(input: z.input<typeof holdSchema>): Promise<PortalResult> {
  const ctx = await activePlannerContext();
  const parsed = holdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.date < today()) return { ok: false, error: "Elige una fecha futura." };
  try {
    await withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
      sql(`select public.create_hold($1, $2, $3, $4, $5)`, [
        ctx.venue.id,
        parsed.data.date,
        parsed.data.eventType,
        parsed.data.guests,
        parsed.data.clientId,
      ]),
    );
  } catch (error) {
    return { ok: false, error: message(error) };
  }
  refresh();
  return { ok: true };
}

export async function cancelHold(bookingId: string): Promise<PortalResult> {
  const ctx = await activePlannerContext();
  const id = z.uuid().parse(bookingId);
  try {
    await withDb({ kind: "user", userId: ctx.user.id }, (sql) =>
      sql(`select public.transition_booking($1, 'cancelled', 'Liberada por el planner')`, [id]),
    );
  } catch (error) {
    return { ok: false, error: message(error) };
  }
  refresh();
  return { ok: true };
}
