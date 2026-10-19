import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { as, createPool } from "./db";
import { buildWorld, nextDate, type World } from "./fixtures";

let pool: pg.Pool;
let w: World;
let bookingA: string;
let bookingDirect: string;
let clientA: string;

const count = (actor: Parameters<typeof as>[1], sql: string, params: unknown[] = []) =>
  as(pool, actor, async (c) => (await c.query(sql, params)).rowCount);

beforeAll(async () => {
  pool = createPool();
  w = await buildWorld(pool, "rls");

  clientA = await as(pool, w.plannerA, async (c) => {
    const { rows } = await c.query(
      `insert into public.clients (full_name, phone, created_by_planner_id) values ('Novios de A', '988 000 111', $1) returning id`,
      [w.plannerA.plannerId],
    );
    return rows[0].id;
  });
  await as(pool, w.plannerA, (c) =>
    c.query(
      `insert into public.leads (venue_id, client_id, planner_id, channel, event_type) values ($1, $2, $3, 'planner', 'wedding')`,
      [w.venueId, clientA, w.plannerA.plannerId],
    ),
  );
  bookingA = await as(pool, w.plannerA, async (c) => {
    const { rows } = await c.query(`select id from public.create_hold($1, $2, 'wedding', 90, $3)`, [
      w.venueId,
      nextDate(),
      clientA,
    ]);
    return rows[0].id;
  });
  bookingDirect = await as(pool, w.ops, async (c) => {
    const { rows } = await c.query(
      `insert into public.bookings (venue_id, client_id, channel, event_type, event_date, guests)
       values ($1, $2, 'direct', 'corporate', $3, 40) returning id`,
      [w.venueId, w.directClientId, nextDate()],
    );
    return rows[0].id;
  });
  await as(pool, "service", (c) =>
    c.query(
      `insert into public.commissions (booking_id, planner_id, base_net, rate, amount) values ($1, $2, 4000, 0.05, 200)`,
      [bookingA, w.plannerA.plannerId],
    ),
  );
});
afterAll(async () => pool.end());

describe("aislamiento de planners (OASIS.md §13)", () => {
  it("el planner A ve lo suyo", async () => {
    expect(await count(w.plannerA, `select 1 from public.bookings`)).toBe(1);
    expect(await count(w.plannerA, `select 1 from public.clients`)).toBe(1);
    expect(await count(w.plannerA, `select 1 from public.leads`)).toBe(1);
    expect(await count(w.plannerA, `select 1 from public.commissions`)).toBe(1);
    expect(await count(w.plannerA, `select 1 from public.planners`)).toBe(1);
  });

  it("el planner B no ve nada del planner A ni de clientes directos", async () => {
    for (const table of [
      "bookings",
      "clients",
      "leads",
      "commissions",
      "payments",
      "documents",
      "quotes",
    ]) {
      expect(await count(w.plannerB, `select 1 from public.${table}`), table).toBe(0);
    }
    expect(
      await count(w.plannerB, `select 1 from public.bookings where id = any($1)`, [
        [bookingA, bookingDirect],
      ]),
    ).toBe(0);
    expect(
      await count(w.plannerB, `select 1 from public.clients where id = any($1)`, [
        [clientA, w.directClientId],
      ]),
    ).toBe(0);
    expect(
      await count(w.plannerB, `select 1 from public.planners where id = $1`, [
        w.plannerA.plannerId,
      ]),
    ).toBe(0);
  });

  it("los planners no ven bloqueos, ocupación, pagos ni auditoría", async () => {
    for (const table of [
      "blocks",
      "occupancy",
      "payments",
      "guarantees",
      "audit_log",
      "activities",
      "campaigns",
    ]) {
      expect(await count(w.plannerA, `select 1 from public.${table}`), table).toBe(0);
    }
  });

  it("el planner B no puede escribir en nombre del planner A", async () => {
    await expect(
      as(pool, w.plannerB, (c) =>
        c.query(`insert into public.clients (full_name, created_by_planner_id) values ('x', $1)`, [
          w.plannerA.plannerId,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(pool, w.plannerB, (c) =>
        c.query(`select public.create_hold($1, $2, 'wedding', 50, $3)`, [
          w.venueId,
          nextDate(),
          clientA,
        ]),
      ),
    ).rejects.toThrow(/client_not_owned/);
    await expect(
      as(pool, w.plannerB, (c) =>
        c.query(`select public.transition_booking($1, 'cancelled', 'x')`, [bookingA]),
      ),
    ).rejects.toThrow(/forbidden/);
    const updated = await count(
      w.plannerB,
      `update public.clients set full_name = 'hack' where id = $1`,
      [clientA],
    );
    expect(updated).toBe(0);
  });

  it("el planner envía vouchers solo de sus reservas y sigue sin leer pagos", async () => {
    const insert = (actor: Parameters<typeof as>[1], booking: string, status = "pending") =>
      as(pool, actor, (c) =>
        c.query(
          `insert into public.payments (booking_id, kind, amount, method, status) values ($1, 'deposit', 500, 'yape', $2)`,
          [booking, status],
        ),
      );
    await insert(w.plannerA, bookingA);
    await expect(insert(w.plannerB, bookingA)).rejects.toThrow(/row-level security/);
    await expect(insert(w.plannerA, bookingDirect)).rejects.toThrow(/row-level security/);
    await expect(insert(w.plannerA, bookingA, "validated")).rejects.toThrow(
      /row-level security|payment_validation_requires_admin/,
    );
    expect(await count(w.plannerA, `select 1 from public.payments`)).toBe(0);
    const [row] = await as(
      pool,
      "service",
      async (c) =>
        (
          await c.query(`select status, created_by from public.payments where booking_id = $1`, [
            bookingA,
          ])
        ).rows,
    );
    expect(row.status).toBe("pending");
    expect(row.created_by).toBe(w.plannerA.sub);
  });

  it("free_dates solo devuelve fechas, sin datos de terceros", async () => {
    const rows = await as(
      pool,
      w.plannerB,
      async (c) =>
        (await c.query(`select * from public.free_dates('rls', current_date, current_date + 30)`))
          .rows,
    );
    for (const r of rows) expect(Object.keys(r)).toEqual(["free_dates"]);
    await expect(
      as(pool, "anon", (c) =>
        c.query(`select public.free_dates('x', current_date, current_date + 1)`),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("solo el admin crea promociones y siempre dentro del tope de descuento", async () => {
    const insert = (actor: Parameters<typeof as>[1], pct: number) =>
      as(pool, actor, (c) =>
        c.query(
          `insert into public.promotions (venue_id, name, starts_on, ends_on, discount_pct)
           values ($1, 'Promo test', current_date, current_date + 30, $2)`,
          [w.venueId, pct],
        ),
      );
    await expect(insert(w.ops, 5)).rejects.toThrow(/row-level security/);
    await expect(insert(w.plannerA, 5)).rejects.toThrow(/row-level security/);
    await expect(insert(w.admin, 50)).rejects.toThrow(/promotion_over_cap/);
    await insert(w.admin, 8);
    expect(await count(w.plannerA, `select 1 from public.promotions`)).toBeGreaterThan(0);
  });

  it("la disponibilidad del planner no expone datos de terceros", async () => {
    const rows = await as(
      pool,
      w.plannerB,
      async (c) =>
        (
          await c.query(
            `select * from public.get_availability($1, current_date, current_date + 400)`,
            [w.venueId],
          )
        ).rows,
    );
    expect(Object.keys(rows[0]).sort()).toEqual(["day", "status"]);
    const statuses = new Set(rows.map((r) => r.status));
    expect([...statuses].every((s) => ["free", "prebooked", "occupied"].includes(s))).toBe(true);
    expect(statuses.has("prebooked")).toBe(true);
  });

  it("un planner no puede darse otro rol", async () => {
    await expect(
      as(pool, w.plannerA, (c) =>
        c.query(`update public.profiles set role = 'admin' where id = $1`, [w.plannerA.sub]),
      ),
    ).rejects.toThrow(/role_change_requires_admin/);
  });

  it("solo el admin cambia parámetros y tarifas", async () => {
    expect(
      await count(w.ops, `update public.settings set value = '0.10' where key = 'igv_rate'`),
    ).toBe(0);
    expect(
      await count(
        w.admin,
        `update public.settings set value = '0.18' where key = 'igv_rate' and venue_id = $1`,
        [w.venueId],
      ),
    ).toBe(1);
    await expect(
      as(pool, w.ops, (c) =>
        c.query(
          `insert into public.rate_cards (venue_id, event_type, day_type, season, guests_max, price_net) values ($1, 'wedding', 'sat', 'high', 150, 6000)`,
          [w.venueId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("solo el admin marca comisiones como pagadas", async () => {
    expect(await count(w.ops, `update public.commissions set status = 'paid'`)).toBe(0);
    expect(await count(w.plannerA, `update public.commissions set status = 'paid'`)).toBe(0);
  });
});

describe("acceso anónimo (web pública)", () => {
  it("no puede leer tablas", async () => {
    await expect(as(pool, "anon", (c) => c.query(`select * from public.clients`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(pool, "anon", (c) => c.query(`select * from public.bookings`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("solo consulta disponible / no disponible", async () => {
    const free = await as(
      pool,
      "anon",
      async (c) =>
        (await c.query(`select public.is_date_available('rls', '2030-01-15') as ok`)).rows[0].ok,
    );
    expect(free).toBe(true);
    await expect(
      as(pool, "anon", (c) =>
        c.query(`select * from public.get_availability($1, current_date, current_date)`, [
          w.venueId,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
