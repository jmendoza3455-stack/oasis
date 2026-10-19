import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withDb } from "@/lib/db";
import { pickVenue } from "@/lib/venue-select";

export type Venue = {
  id: string;
  slug: string;
  name: string;
  endorsement: string;
  timezone: string;
};

const DEFAULT_SLUG = process.env.OASIS_VENUE_SLUG ?? "oasis-pachacamac";
export const VENUE_COOKIE = "oasis_venue";

/** Local de la web pública y de los procesos automáticos (uno por despliegue por ahora). */
export async function activeVenue(): Promise<Venue> {
  const slug = DEFAULT_SLUG;
  const rows = await withDb({ kind: "service" }, (sql) =>
    sql<Venue>(
      `select id, slug, name, endorsement, timezone from venues where slug = $1 and is_active`,
      [slug],
    ),
  );
  if (!rows[0]) throw new Error(`Venue "${slug}" no existe o está inactivo`);
  return rows[0];
}

/** Local de una reserva que el usuario puede ver (RLS por local); error si no la ve. */
export async function bookingVenueId(userId: string, bookingId: string): Promise<string> {
  const [b] = await withDb({ kind: "user", userId }, (sql) =>
    sql<{ venueId: string }>(`select venue_id as "venueId" from bookings where id = $1`, [
      bookingId,
    ]),
  );
  if (!b) throw new Error("Reserva no encontrada.");
  return b.venueId;
}

/** Locales a los que el usuario tiene acceso (admin: todos; operaciones: donde es miembro). */
export async function staffVenues(userId: string): Promise<Venue[]> {
  return withDb({ kind: "user", userId }, (sql) =>
    sql<Venue>(
      `select id, slug, name, endorsement, timezone from venues
        where id in (select public.my_venue_ids()) order by name`,
    ),
  );
}

/**
 * Local con el que trabaja el back-office: el elegido en el selector (cookie) si el usuario tiene
 * acceso; la base de datos vuelve a verificarlo en cada consulta (RLS por local).
 */
export async function staffVenue(userId: string): Promise<Venue> {
  const venues = await staffVenues(userId);
  const wanted = (await cookies()).get(VENUE_COOKIE)?.value;
  const venue = pickVenue(venues, wanted, DEFAULT_SLUG);
  if (!venue) redirect("/ingresar?error=sin_local");
  return venue;
}
