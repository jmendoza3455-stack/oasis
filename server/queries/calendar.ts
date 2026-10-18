import "server-only";
import { withDb } from "@/lib/db";
import type { BookingStatus } from "@/lib/domain";

export type CalendarBooking = {
  id: string;
  eventDate: string;
  status: BookingStatus;
  channel: "planner" | "direct" | "referral" | "organic";
  eventType: "wedding" | "social" | "corporate" | "family_day";
  guests: number;
  clientName: string | null;
  plannerName: string | null;
  holdExpiresAt: string | null;
  rentalGross: number;
};

export type CalendarBlock = {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  kind: string;
};

/** Reservas y bloqueos del rango (RLS: solo staff ve todo). */
export async function calendarData(userId: string, venueId: string, from: string, to: string) {
  return withDb({ kind: "user", userId }, async (sql) => {
    const bookings = await sql<CalendarBooking>(
      `select b.id, to_char(b.event_date, 'YYYY-MM-DD') as "eventDate", b.status, b.channel,
              b.event_type as "eventType", b.guests, c.full_name as "clientName",
              p.business_name as "plannerName", to_json(b.hold_expires_at) #>> '{}' as "holdExpiresAt",
              b.rental_gross::float8 as "rentalGross"
         from bookings b
         left join clients c on c.id = b.client_id
         left join planners p on p.id = b.planner_id
        where b.venue_id = $1 and b.event_date between $2 and $3
          and not (b.status = 'prebooked' and b.hold_expires_at <= now())
        order by b.event_date`,
      [venueId, from, to],
    );
    const blocks = await sql<CalendarBlock>(
      `select id, to_char(starts_on, 'YYYY-MM-DD') as "startsOn", to_char(ends_on, 'YYYY-MM-DD') as "endsOn",
              reason, kind
         from blocks where venue_id = $1 and ends_on >= $2 and starts_on <= $3
        order by starts_on`,
      [venueId, from, to],
    );
    return { bookings, blocks };
  });
}
