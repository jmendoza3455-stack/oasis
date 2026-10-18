import { withDb } from "@/lib/db";
import { buildIcs, STATUS_LABEL, type BookingStatus, type EventType } from "@/lib/domain";
import { verifyIcalToken } from "@/lib/feed-token";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { activeVenue } from "@/server/venue";

// Feed iCal del calendario maestro para el Google Calendar de los socios (OASIS.md §6.5).
// Sin datos personales: tipo, estado, invitados y planner. URL secreta firmada.

export async function GET(request: Request, ctx: RouteContext<"/api/ical/[token]">) {
  const venue = await activeVenue();
  const { token } = await ctx.params;
  if (!verifyIcalToken(venue.id, token.replace(/\.ics$/, ""))) {
    return new Response("Not found", { status: 404 });
  }
  const origin = new URL(request.url).origin;
  const { bookings, blocks } = await withDb(
    { kind: "service", actorName: "ical" },
    async (sql) => ({
      bookings: await sql<{
        id: string;
        date: string;
        status: BookingStatus;
        eventType: EventType;
        guests: number;
        planner: string | null;
        updatedAt: Date;
      }>(
        `select b.id, to_char(b.event_date, 'YYYY-MM-DD') as date, b.status, b.event_type as "eventType", b.guests,
              p.business_name as planner, b.updated_at as "updatedAt"
         from bookings b left join planners p on p.id = b.planner_id
        where b.venue_id = $1 and b.status not in ('cancelled', 'expired')
          and b.event_date >= (now() at time zone 'America/Lima')::date - 90
        order by b.event_date`,
        [venue.id],
      ),
      blocks: await sql<{
        id: string;
        s: string;
        e: string;
        reason: string | null;
        createdAt: Date;
      }>(
        `select id, to_char(starts_on, 'YYYY-MM-DD') as s, to_char(ends_on, 'YYYY-MM-DD') as e, reason,
              created_at as "createdAt"
         from blocks where venue_id = $1 and ends_on >= (now() at time zone 'America/Lima')::date - 90`,
        [venue.id],
      ),
    }),
  );
  const ics = buildIcs(`${venue.name} · Calendario maestro`, [
    ...bookings.map((b) => ({
      uid: `${b.id}@oasis`,
      start: b.date,
      summary: `${EVENT_TYPE_LABEL[b.eventType]} · ${STATUS_LABEL[b.status]}`,
      description: [`${b.guests} invitados`, b.planner ? `Planner: ${b.planner}` : null]
        .filter(Boolean)
        .join("\n"),
      url: `${origin}/admin/reservas/${b.id}`,
      updatedAt: b.updatedAt,
    })),
    ...blocks.map((k) => ({
      uid: `${k.id}@oasis-bloqueo`,
      start: k.s,
      end: k.e,
      summary: `Bloqueado${k.reason ? ` · ${k.reason}` : ""}`,
      updatedAt: k.createdAt,
    })),
  ]);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="oasis.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
