import "server-only";
import { withDb } from "@/lib/db";
import type { BusinessHours, EventType } from "@/lib/domain";

export type LeadStage =
  | "new"
  | "contacted"
  | "visit_scheduled"
  | "quoted"
  | "prebooked"
  | "reserved"
  | "contracted"
  | "done"
  | "settled"
  | "lost";

export const STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "Nuevo" },
  { key: "contacted", label: "Contactado" },
  { key: "visit_scheduled", label: "Visita agendada" },
  { key: "quoted", label: "Cotizado" },
  { key: "prebooked", label: "Pre-reserva" },
  { key: "reserved", label: "Separado" },
  { key: "contracted", label: "Contratado" },
  { key: "done", label: "Realizado" },
  { key: "settled", label: "Liquidado" },
  { key: "lost", label: "Perdido" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<
  LeadStage,
  string
>;

export type LeadCard = {
  id: string;
  stage: LeadStage;
  clientName: string | null;
  phone: string | null;
  email: string | null;
  eventType: EventType | null;
  eventDate: string | null;
  guests: number | null;
  channel: "planner" | "direct" | "referral" | "organic";
  plannerName: string | null;
  utmCampaign: string | null;
  attributionAlert: string | null;
  createdAt: string;
  firstResponseAt: string | null;
  nextActionAt: string | null;
  lostReason: string | null;
};

const LEAD_SELECT = `
  select l.id, l.stage, c.full_name as "clientName", c.phone, c.email, l.event_type as "eventType",
         to_char(l.event_date, 'YYYY-MM-DD') as "eventDate", l.guests, l.channel, p.business_name as "plannerName",
         l.utm_campaign as "utmCampaign", l.attribution_alert as "attributionAlert",
         to_json(l.created_at) #>> '{}' as "createdAt", to_json(l.first_response_at) #>> '{}' as "firstResponseAt",
         to_json(l.next_action_at) #>> '{}' as "nextActionAt", l.lost_reason as "lostReason"
    from leads l
    left join clients c on c.id = l.client_id
    left join planners p on p.id = l.planner_id`;

export async function leadBoard(
  userId: string,
  venueId: string,
  filters: { channel?: string; eventType?: string },
) {
  return withDb({ kind: "user", userId }, async (sql) => {
    const leads = await sql<LeadCard>(
      `${LEAD_SELECT}
        where l.venue_id = $1
          and ($2::text is null or l.channel::text = $2)
          and ($3::text is null or l.event_type::text = $3)
          and (l.stage not in ('settled', 'lost') or l.updated_at > now() - interval '60 days')
        order by l.created_at desc`,
      [venueId, filters.channel ?? null, filters.eventType ?? null],
    );
    const [sla] = await sql<{ hours: BusinessHours; minutes: number }>(
      `select (select value from settings where venue_id = $1 and key = 'business_hours') as hours,
              coalesce((select (value #>> '{}')::int from settings where venue_id = $1 and key = 'first_response_sla_minutes'), 15) as minutes`,
      [venueId],
    );
    return {
      leads,
      sla: {
        hours: sla.hours ?? { days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "19:00" },
        minutes: sla.minutes,
      },
    };
  });
}

export type LeadDetail = LeadCard & {
  clientId: string | null;
  plannerId: string | null;
  message: string | null;
  utm: Record<string, string | null>;
  landingPath: string | null;
  protectedUntil: string | null;
  activities: {
    id: string;
    kind: string;
    notes: string | null;
    dueAt: string | null;
    createdAt: string;
    actor: string | null;
  }[];
  bookings: { id: string; eventDate: string; status: string }[];
};

export async function leadDetail(userId: string, id: string): Promise<LeadDetail | null> {
  return withDb({ kind: "user", userId }, async (sql) => {
    const [l] = await sql<
      LeadCard & {
        clientId: string | null;
        plannerId: string | null;
        message: string | null;
        utmSource: string | null;
        utmMedium: string | null;
        utmContent: string | null;
        utmTerm: string | null;
        gclid: string | null;
        fbclid: string | null;
        landingPath: string | null;
        protectedUntil: string | null;
      }
    >(
      `${LEAD_SELECT.replace(
        "select l.id,",
        `select l.id, l.client_id as "clientId", l.planner_id as "plannerId", l.message,
              l.utm_source as "utmSource", l.utm_medium as "utmMedium", l.utm_content as "utmContent", l.utm_term as "utmTerm",
              l.gclid, l.fbclid, l.landing_path as "landingPath", to_char(l.protected_until, 'YYYY-MM-DD') as "protectedUntil",`,
      )}
        where l.id = $1`,
      [id],
    );
    if (!l) return null;
    const activities = await sql<LeadDetail["activities"][number]>(
      `select a.id, a.kind, a.notes, to_json(a.due_at) #>> '{}' as "dueAt", to_json(a.created_at) #>> '{}' as "createdAt",
              coalesce(pr.email, a.actor_type::text) as actor
         from activities a left join profiles pr on pr.id = a.actor_id
        where a.lead_id = $1 order by a.created_at desc`,
      [id],
    );
    const bookings = await sql<LeadDetail["bookings"][number]>(
      `select id, to_char(event_date, 'YYYY-MM-DD') as "eventDate", status from bookings where lead_id = $1 order by created_at desc`,
      [id],
    );
    const { utmSource, utmMedium, utmContent, utmTerm, gclid, fbclid, ...rest } = l;
    return {
      ...rest,
      utm: {
        source: utmSource,
        medium: utmMedium,
        campaign: l.utmCampaign,
        content: utmContent,
        term: utmTerm,
        gclid,
        fbclid,
      },
      activities,
      bookings,
    };
  });
}
