import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { as, createPool } from "./db";
import { buildWorld, type World } from "./fixtures";

// Evidencia de que el calendario público dice la verdad: con operaciones aleatorias (bloqueos,
// pre-reservas, reservas, pernoctes, vencimientos y cancelaciones), en todas las fechas de la
// ventana el estado público coincide con (a) un recálculo directo desde bookings/blocks
// (availability_mismatches) y (b) is_date_available; y la BD nunca acepta dos ocupaciones.

let pool: pg.Pool;
let w: World;
let run = 0;
const seen = { free: 0, hold: 0, taken: 0 };
const WINDOW = 21;

beforeAll(async () => {
  pool = createPool();
  w = await buildWorld(pool, "calprop");
});
afterAll(async () => pool.end());

type Op =
  | { kind: "block"; day: number; len: number }
  | { kind: "hold"; day: number; overnight: boolean }
  | { kind: "reserve"; day: number; overnight: boolean }
  | { kind: "expire"; index: number }
  | { kind: "cancel"; index: number };

const op: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    kind: fc.constant("block" as const),
    day: fc.nat(WINDOW - 3),
    len: fc.integer({ min: 1, max: 3 }),
  }),
  fc.record({
    kind: fc.constant("hold" as const),
    day: fc.nat(WINDOW - 2),
    overnight: fc.boolean(),
  }),
  fc.record({
    kind: fc.constant("reserve" as const),
    day: fc.nat(WINDOW - 2),
    overnight: fc.boolean(),
  }),
  fc.record({ kind: fc.constant("expire" as const), index: fc.nat(20) }),
  fc.record({ kind: fc.constant("cancel" as const), index: fc.nat(20) }),
);

const iso = (base: Date, offset: number) =>
  new Date(base.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

/** Ejecuta la operación; un conflicto de ocupación es un rechazo válido de la BD. */
async function apply(o: Op, base: Date, ids: string[]) {
  try {
    if (o.kind === "block") {
      await as(pool, w.ops, (c) =>
        c.query(
          `insert into public.blocks (venue_id, starts_on, ends_on, reason) values ($1, $2, $3, 'prop')`,
          [w.venueId, iso(base, o.day), iso(base, o.day + o.len - 1)],
        ),
      );
      return;
    }
    if (o.kind === "hold" || o.kind === "reserve") {
      const b = await as(pool, w.ops, async (c) => {
        const { rows } = await c.query(
          `insert into public.bookings (venue_id, client_id, channel, event_type, event_date, guests, overnight, rental_list_net)
           values ($1, $2, 'direct', 'wedding', $3, 80, $4, 4000) returning id, deposit_amount`,
          [w.venueId, w.directClientId, iso(base, o.day), o.overnight],
        );
        return rows[0];
      });
      ids.push(b.id);
      if (o.kind === "reserve")
        await as(pool, w.admin, async (c) => {
          await c.query(
            `insert into public.payments (booking_id, kind, amount, method, status) values ($1, 'deposit', $2, 'transfer', 'validated')`,
            [b.id, b.deposit_amount],
          );
          await c.query(`select public.transition_booking($1, 'reserved')`, [b.id]);
        });
      return;
    }
    const id = ids[o.index % Math.max(ids.length, 1)];
    if (!id) return;
    if (o.kind === "expire")
      await as(pool, "service", (c) =>
        c.query(
          `update public.bookings set hold_expires_at = now() - interval '1 minute' where id = $1 and status = 'prebooked'`,
          [id],
        ),
      );
    else
      await as(pool, w.admin, (c) =>
        c.query(`select public.transition_booking($1, 'cancelled', 'prop')`, [id]),
      );
  } catch (error) {
    const msg = (error as Error).message;
    // Rechazos legítimos: fecha ocupada o transición no permitida desde el estado actual
    if (!/occupancy_no_overlap|invalid_transition/.test(msg)) throw error;
  }
}

describe("calendario público (propiedad)", () => {
  it("coincide con las reservas y bloqueos reales en todas las fechas", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(op, { minLength: 1, maxLength: 14 }), async (ops) => {
        run += 1;
        // Ventana propia por corrida, lejos de los demás tests
        const base = new Date(Date.UTC(2032, 0, 1) + run * (WINDOW + 5) * 86_400_000);
        const ids: string[] = [];
        for (const o of ops) await apply(o, base, ids);
        const from = iso(base, 0);
        const to = iso(base, WINDOW);

        const mismatches = await as(
          pool,
          "service",
          async (c) =>
            (
              await c.query(`select * from public.availability_mismatches('calprop', $1, $2)`, [
                from,
                to,
              ])
            ).rows,
        );
        expect(mismatches).toEqual([]);

        const rows = await as(
          pool,
          "anon",
          async (c) =>
            (
              await c.query(
                `select to_char(p.day, 'YYYY-MM-DD') as day, p.status, public.is_date_available('calprop', p.day) as ok
                 from public.public_availability('calprop', $1, $2) p`,
                [from, to],
              )
            ).rows as { day: string; status: string; ok: boolean }[],
        );
        expect(rows).toHaveLength(WINDOW + 1);
        for (const r of rows) seen[r.status as keyof typeof seen] += 1;
        for (const r of rows)
          expect({ day: r.day, free: r.status === "free" }).toEqual({ day: r.day, free: r.ok });
      }),
      { numRuns: 30 },
    );
    // La generación sí produjo los tres estados (si no, la propiedad no probaría nada)
    expect(seen.free).toBeGreaterThan(0);
    expect(seen.hold).toBeGreaterThan(0);
    expect(seen.taken).toBeGreaterThan(0);
  }, 120_000);
});
