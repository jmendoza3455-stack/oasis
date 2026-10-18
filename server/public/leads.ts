import "server-only";
import { withDb, type DbActor } from "@/lib/db";
import {
  findProtectedMatch,
  normalizeEmail,
  normalizePhone,
  normalizeRuc,
  type EventType,
} from "@/lib/domain";
import { activeVenue } from "@/server/venue";

// Alta de lead compartida por el formulario web y el Recepcionista: UTM de punta a punta y
// atribución al planner por 90 días (CLAUDE.md reglas 5 y 8).

export type NewLead = {
  fullName: string;
  phone: string;
  email?: string | null;
  eventType: EventType;
  eventDate?: string | null;
  guests?: number | null;
  message?: string | null;
  marketing: boolean;
  sourceForm: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  landing_path?: string | null;
  referrer?: string | null;
};

function todayLima() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

export async function createLead(d: NewLead, actor: DbActor): Promise<{ leadId: string }> {
  const venue = await activeVenue();
  const today = todayLima();

  return withDb(actor, async (sql) => {
    // Atribución: ¿algún planner registró a este cliente en los últimos días de protección?
    const phone = normalizePhone(d.phone);
    const email = d.email ? normalizeEmail(d.email) : null;
    const [setting] = await sql<{ days: number }>(
      `select coalesce((value #>> '{}')::int, 90) as days from settings where venue_id = $1 and key = 'planner_protection_days'`,
      [venue.id],
    );
    const candidates = await sql<{
      plannerId: string;
      clientId: string;
      phone: string | null;
      email: string | null;
      ruc: string | null;
      registeredOn: string;
    }>(
      `select created_by_planner_id as "plannerId", id as "clientId", phone, email, ruc,
              to_char(created_at at time zone 'America/Lima', 'YYYY-MM-DD') as "registeredOn"
         from clients
        where created_by_planner_id is not null
          and ((right(phone_norm, 9) = $1) or (email_norm = $2))`,
      [phone, email],
    );
    const match = findProtectedMatch(
      { phone, email, ruc: normalizeRuc(null) },
      candidates,
      today,
      setting?.days ?? 90,
    );

    const [client] = await sql<{ id: string }>(
      `insert into clients (full_name, phone, email, marketing_consent, privacy_accepted_at)
       values ($1, $2, $3, $4, now()) returning id`,
      [d.fullName, d.phone, d.email ?? null, d.marketing],
    );
    const channel = match ? "planner" : d.utm_source || d.gclid || d.fbclid ? "direct" : "organic";
    const [lead] = await sql<{ id: string }>(
      `insert into leads (venue_id, client_id, planner_id, channel, event_type, event_date, guests, message,
                          utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid,
                          landing_path, referrer, consent_marketing, source_form, attribution_alert,
                          protected_until)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       returning id`,
      [
        venue.id,
        client.id,
        match?.plannerId ?? null,
        channel,
        d.eventType,
        d.eventDate ?? null,
        d.guests ?? null,
        d.message ?? null,
        d.utm_source ?? null,
        d.utm_medium ?? null,
        d.utm_campaign ?? null,
        d.utm_content ?? null,
        d.utm_term ?? null,
        d.gclid ?? null,
        d.fbclid ?? null,
        d.landing_path ?? null,
        d.referrer ?? null,
        d.marketing,
        d.sourceForm,
        match
          ? `Cliente registrado por un planner (match por ${match.matchedOn.join(", ")}); protegido hasta ${match.protectedUntil}`
          : null,
        match?.protectedUntil ?? null,
      ],
    );
    return { leadId: lead.id };
  });
}
