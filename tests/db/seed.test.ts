import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { peruHolidays } from "@/lib/domain";
import { as, createPool } from "./db";

let pool: pg.Pool;

beforeAll(async () => {
  pool = createPool();
  const seed = readFileSync(path.resolve(__dirname, "../../supabase/seed.sql"), "utf8");
  const c = await pool.connect();
  try {
    await c.query(seed);
  } finally {
    c.release();
  }
});
afterAll(async () => pool.end());

const one = async (sql: string) => as(pool, "service", async (c) => (await c.query(sql)).rows[0]);

describe("seed de demo (OASIS.md §12)", () => {
  it("carga las cantidades pedidas", async () => {
    const r = await one(`
      select
        (select count(*) from planners where email like '%@demo.oasis.test')::int as planners,
        (select count(*) from leads l join venues v on v.id = l.venue_id where v.slug = 'oasis-pachacamac')::int as leads,
        (select count(*) from bookings b join venues v on v.id = b.venue_id where v.slug = 'oasis-pachacamac')::int as bookings,
        (select count(*) from campaigns c join venues v on v.id = c.venue_id where v.slug = 'oasis-pachacamac')::int as campaigns,
        (select count(*) from campaign_spend)::int as spend,
        (select count(*) from blocks b join venues v on v.id = b.venue_id where v.slug = 'oasis-pachacamac')::int as blocks,
        (select count(*) from holidays where date >= '2026-01-01' and date < '2028-01-01')::int as holidays,
        (select count(*) from rate_cards r join venues v on v.id = r.venue_id where v.slug = 'oasis-pachacamac')::int as rates`);
    expect(r).toMatchObject({
      planners: 3,
      leads: 20,
      bookings: 10,
      campaigns: 2,
      blocks: 1,
      rates: 32,
    });
    expect(r.spend).toBeGreaterThanOrEqual(2);
    expect(r.holidays).toBeGreaterThanOrEqual(30);
  });

  it("las reservas cubren todos los estados del flujo", async () => {
    const r = await one(`
      select array_agg(distinct status::text order by status::text) as statuses
        from bookings b join venues v on v.id = b.venue_id where v.slug = 'oasis-pachacamac'`);
    expect(r.statuses).toEqual([
      "cancelled",
      "confirmed",
      "done",
      "prebooked",
      "reserved",
      "settled",
    ]);
  });

  it("cada transición del seed quedó auditada", async () => {
    const r = await one(`select count(*)::int as n from audit_log
                          where entity = 'bookings' and action = 'update' and actor_type = 'system'`);
    expect(r.n).toBeGreaterThanOrEqual(12);
  });

  it("hay feriados cargados para todo el horizonte del calendario público (2026–2028)", async () => {
    const rows = await as(pool, "service", async (c) =>
      (
        await c.query(
          `select to_char(date, 'YYYY-MM-DD') as d from holidays where type = 'feriado' and date between '2026-01-01' and '2028-12-31'`,
        )
      ).rows.map((r) => r.d as string),
    );
    const loaded = new Set(rows);
    const expected = [2026, 2027, 2028].flatMap((y) => peruHolidays(y).map((h) => h.date));
    expect(expected.filter((d) => !loaded.has(d))).toEqual([]);
  });
});
