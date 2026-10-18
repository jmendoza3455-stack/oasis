import "server-only";
import { withDb } from "@/lib/db";

export type Venue = {
  id: string;
  slug: string;
  name: string;
  endorsement: string;
  timezone: string;
};

/** Venue activo (la UI muestra uno solo; el modelo es multi-espacio). */
export async function activeVenue(): Promise<Venue> {
  const slug = process.env.OASIS_VENUE_SLUG ?? "oasis-pachacamac";
  const rows = await withDb({ kind: "service" }, (sql) =>
    sql<Venue>(
      `select id, slug, name, endorsement, timezone from venues where slug = $1 and is_active`,
      [slug],
    ),
  );
  if (!rows[0]) throw new Error(`Venue "${slug}" no existe o está inactivo`);
  return rows[0];
}
