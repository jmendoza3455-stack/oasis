import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { withDb } from "@/lib/db";

/**
 * Vista previa de la marca madre: libre en local, CI y despliegues de prueba de Vercel; en
 * producción solo para admin (no se publica hasta elegir el nombre, OASIS.md §15.14).
 */
export async function requirePreview() {
  await connection();
  if (process.env.VERCEL_ENV === "production") await requireAdmin();
}

/** Fecha de hoy en Lima (aaaa-mm-dd). Solo en contenido que espera la petición (requirePreview). */
export const limaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

export type BrandInfo = { name: string; isPlaceholder: boolean };

export async function brandInfo(): Promise<BrandInfo> {
  "use cache";
  cacheLife("hours");
  cacheTag("public-settings");
  const [b] = await withDb({ kind: "service" }, (sql) =>
    sql<BrandInfo>(
      `select name, is_placeholder as "isPlaceholder" from brands order by created_at limit 1`,
    ),
  );
  return b ?? { name: "Marca por definir", isPlaceholder: true };
}

export type BrandVenue = {
  slug: string;
  name: string;
  address: string | null;
  capacity: { cocktail: number | null; banquet: number | null; full_day: number | null };
};

/** Locales activos de la marca con los datos públicos de su Configuración. */
export async function brandVenues(): Promise<BrandVenue[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("public-settings");
  return withDb({ kind: "service" }, (sql) =>
    sql<BrandVenue>(
      `select v.slug, v.name,
              nullif((select value #>> '{}' from settings s where s.venue_id = v.id and s.key = 'venue_address'), '') as address,
              coalesce((select value from settings s where s.venue_id = v.id and s.key = 'capacity'),
                       '{}'::jsonb) as capacity
         from venues v where v.is_active order by v.name`,
    ),
  );
}

/** Estado de un día en cada local (misma función pública que el calendario: sin datos de terceros). */
export async function availabilityOn(
  date: string,
): Promise<Record<string, "free" | "hold" | "taken">> {
  const venues = await brandVenues();
  const out: Record<string, "free" | "hold" | "taken"> = {};
  await withDb({ kind: "service" }, async (sql) => {
    for (const v of venues) {
      const [r] = await sql<{ status: "free" | "hold" | "taken" }>(
        `select status from public.public_availability($1, $2::date, $2::date)`,
        [v.slug, date],
      );
      out[v.slug] = r?.status ?? "taken";
    }
  });
  return out;
}

/** Tasa de IGV de Configuración (nunca hardcodeada). */
export async function igvRate(): Promise<number> {
  "use cache";
  cacheLife("hours");
  cacheTag("public-settings");
  const [r] = await withDb({ kind: "service" }, (sql) =>
    sql<{ rate: number }>(
      `select (value #>> '{}')::float8 as rate from settings where key = 'igv_rate' order by venue_id limit 1`,
    ),
  );
  return r?.rate ?? 0.18;
}
