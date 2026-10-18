import type pg from "pg";
import { as } from "./db";

export const AGREEMENT_VERSION = "2026-10";

export type World = {
  venueId: string;
  admin: { sub: string };
  ops: { sub: string };
  plannerA: { sub: string; plannerId: string };
  plannerB: { sub: string; plannerId: string };
  directClientId: string;
};

async function createUser(c: pg.PoolClient, email: string, role: string, plannerId?: string) {
  const { rows } = await c.query(
    `insert into auth.users (email, raw_app_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify({ role, ...(plannerId ? { planner_id: plannerId } : {}) })],
  );
  return rows[0].id as string;
}

/** Venue, settings, usuarios por rol, dos planners activos con contrato aceptado y un cliente directo. */
export async function buildWorld(pool: pg.Pool, slug = "oasis-pachacamac"): Promise<World> {
  return as(pool, "service", async (c) => {
    const venue = await c.query(
      `insert into public.venues (slug, name) values ($1, 'Oasis Pachacámac') returning id`,
      [slug],
    );
    const venueId = venue.rows[0].id as string;
    const settings: Record<string, unknown> = {
      booking_mode: "one_per_day",
      igv_rate: 0.18,
      hold_hours: 72,
      planner_max_active_holds: 2,
      deposit_pct: 0.5,
      balance_due_days: 15,
      discount_cap_pct: 10,
      guarantee_amounts: { wedding: 1000, social: 1000, corporate: 1000, family_day: 500 },
      planner_agreement_version: AGREEMENT_VERSION,
    };
    for (const [key, value] of Object.entries(settings)) {
      await c.query(`insert into public.settings (venue_id, key, value) values ($1, $2, $3)`, [
        venueId,
        key,
        JSON.stringify(value),
      ]);
    }

    const planners: string[] = [];
    for (const name of ["A", "B"]) {
      const p = await c.query(
        `insert into public.planners (business_name, contact_name, email, status)
         values ($1, $2, $3, 'active') returning id`,
        [
          `Planner ${name} ${slug}`,
          `Contacto ${name}`,
          `planner${name.toLowerCase()}@${slug}.test`,
        ],
      );
      planners.push(p.rows[0].id);
    }

    const admin = await createUser(c, `admin@${slug}.test`, "admin");
    const ops = await createUser(c, `ops@${slug}.test`, "ops");
    const pa = await createUser(c, `pa@${slug}.test`, "planner", planners[0]);
    const pb = await createUser(c, `pb@${slug}.test`, "planner", planners[1]);

    for (const [plannerId, userId] of [
      [planners[0], pa],
      [planners[1], pb],
    ]) {
      await c.query(
        `insert into public.planner_agreements (planner_id, version, accepted_by) values ($1, $2, $3)`,
        [plannerId, AGREEMENT_VERSION, userId],
      );
    }

    const client = await c.query(
      `insert into public.clients (full_name, phone, email) values ('Cliente Directo', '999 111 222', 'directo@test.pe') returning id`,
    );

    return {
      venueId,
      admin: { sub: admin },
      ops: { sub: ops },
      plannerA: { sub: pa, plannerId: planners[0] },
      plannerB: { sub: pb, plannerId: planners[1] },
      directClientId: client.rows[0].id,
    };
  });
}

let dayOffset = 30;
/** Fecha futura única por test para no chocar entre casos. */
export function nextDate() {
  dayOffset += 1;
  const d = new Date(Date.UTC(2027, 0, 1) + dayOffset * 86_400_000);
  return d.toISOString().slice(0, 10);
}
