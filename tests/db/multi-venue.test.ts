import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { as, createPool } from "./db";
import { buildWorld, type World } from "./fixtures";

// F1 · Personal por local (OASIS.md §15.14): operaciones de un local no ve ni opera otro local;
// el admin ve todos. Mismo patrón que las pruebas de aislamiento de planners (regla 3).

let pool: pg.Pool;
let a: World;
let b: World;
const ids: Record<string, string> = {};

beforeAll(async () => {
  pool = createPool();
  a = await buildWorld(pool, "local-a");
  b = await buildWorld(pool, "local-b");
  // Datos del local B: lead, reserva, pago, bloqueo y actividad
  await as(pool, "service", async (c) => {
    ids.lead = (
      await c.query(
        `insert into public.leads (venue_id, client_id, channel, event_type) values ($1, $2, 'direct', 'wedding') returning id`,
        [b.venueId, b.directClientId],
      )
    ).rows[0].id;
    ids.booking = (
      await c.query(
        `insert into public.bookings (venue_id, client_id, channel, event_type, event_date, guests, rental_list_net)
         values ($1, $2, 'direct', 'wedding', '2029-05-12', 80, 4000) returning id`,
        [b.venueId, b.directClientId],
      )
    ).rows[0].id;
    await c.query(
      `insert into public.payments (booking_id, kind, amount, method) values ($1, 'deposit', 100, 'transfer')`,
      [ids.booking],
    );
    await c.query(
      `insert into public.activities (lead_id, kind, notes, actor_type) values ($1, 'note', 'nota B', 'user')`,
      [ids.lead],
    );
  });
});
afterAll(async () => pool.end());

const count = (actor: Parameters<typeof as>[1], sql: string, params: unknown[] = []) =>
  as(pool, actor, async (c) => (await c.query(sql, params)).rows[0].n as number);

describe("personal por local", () => {
  it("operaciones de A no ve leads, reservas, pagos ni notas de B; el admin sí", async () => {
    const q = {
      leads: `select count(*)::int n from public.leads where id = $1`,
      bookings: `select count(*)::int n from public.bookings where id = $1`,
      payments: `select count(*)::int n from public.payments where booking_id = $1`,
      activities: `select count(*)::int n from public.activities where lead_id = $1`,
    };
    expect(await count(a.ops, q.leads, [ids.lead])).toBe(0);
    expect(await count(a.ops, q.bookings, [ids.booking])).toBe(0);
    expect(await count(a.ops, q.payments, [ids.booking])).toBe(0);
    expect(await count(a.ops, q.activities, [ids.lead])).toBe(0);
    expect(await count(b.ops, q.bookings, [ids.booking])).toBe(1);
    expect(await count(b.ops, q.payments, [ids.booking])).toBe(1);
    expect(await count(a.admin, q.bookings, [ids.booking])).toBe(1);
  });

  it("operaciones de A no puede crear ni cambiar datos en B", async () => {
    await expect(
      as(pool, a.ops, (c) =>
        c.query(
          `insert into public.leads (venue_id, client_id, channel, event_type) values ($1, $2, 'direct', 'wedding')`,
          [b.venueId, b.directClientId],
        ),
      ),
    ).rejects.toThrow();
    await expect(
      as(pool, a.ops, (c) =>
        c.query(
          `insert into public.payments (booking_id, kind, amount, method) values ($1, 'deposit', 50, 'cash')`,
          [ids.booking],
        ),
      ),
    ).rejects.toThrow();
    const upd = await as(pool, a.ops, (c) =>
      c.query(`update public.bookings set guests = 10 where id = $1`, [ids.booking]),
    );
    expect(upd.rowCount).toBe(0);
    // La máquina de estados también verifica el local
    await expect(
      as(pool, a.ops, (c) =>
        c.query(`select public.transition_booking($1, 'cancelled', 'prueba')`, [ids.booking]),
      ),
    ).rejects.toThrow(/forbidden/);
    await expect(
      as(pool, a.ops, (c) =>
        c.query(`select * from public.get_availability($1, current_date, current_date + 7)`, [
          b.venueId,
        ]),
      ),
    ).rejects.toThrow(/forbidden/);
  });

  it("mis locales: operaciones ve el suyo; el admin, todos; sin asignación, ninguno", async () => {
    const mine = (actor: Parameters<typeof as>[1]) =>
      as(pool, actor, async (c) =>
        (await c.query(`select public.my_venue_ids() as id`)).rows.map((r) => r.id),
      );
    expect(await mine(a.ops)).toEqual([a.venueId]);
    expect(await mine(a.admin)).toEqual(expect.arrayContaining([a.venueId, b.venueId]));
    await as(pool, "service", (c) =>
      c.query(`delete from public.venue_members where user_id = $1`, [a.ops.sub]),
    );
    expect(await mine(a.ops)).toEqual([]);
    await as(pool, "service", (c) =>
      c.query(`insert into public.venue_members (venue_id, user_id) values ($1, $2)`, [
        a.venueId,
        a.ops.sub,
      ]),
    );
  });

  it("solo el admin asigna locales; nadie se da acceso a sí mismo", async () => {
    await expect(
      as(pool, a.ops, (c) =>
        c.query(`insert into public.venue_members (venue_id, user_id) values ($1, $2)`, [
          b.venueId,
          a.ops.sub,
        ]),
      ),
    ).rejects.toThrow();
    const r = await as(pool, a.admin, (c) =>
      c.query(
        `insert into public.venue_members (venue_id, user_id) values ($1, $2) on conflict do nothing`,
        [b.venueId, a.ops.sub],
      ),
    );
    expect(r.rowCount).toBe(1);
    expect(
      await count(a.ops, `select count(*)::int n from public.bookings where id = $1`, [
        ids.booking,
      ]),
    ).toBe(1);
    await as(pool, "service", (c) =>
      c.query(`delete from public.venue_members where venue_id = $1 and user_id = $2`, [
        b.venueId,
        a.ops.sub,
      ]),
    );
  });

  it("cada local pertenece a una marca", async () => {
    const [row] = await as(
      pool,
      "service",
      async (c) =>
        (await c.query(`select brand_id from public.venues where id = $1`, [a.venueId])).rows,
    );
    expect(row.brand_id).toBeTruthy();
  });
});
