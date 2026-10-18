import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { as, createPool } from "./db";
import { buildWorld, type World } from "./fixtures";

let pool: pg.Pool;
let w: World;

beforeAll(async () => {
  pool = createPool();
  w = await buildWorld(pool, "money");
  await as(pool, "service", (c) =>
    c.query(
      `insert into settings (venue_id, key, value) values ($1, 'planner_commission_rate', '0.05'), ($1, 'commission_payment_days', '7')`,
      [w.venueId],
    ),
  );
});
afterAll(async () => pool.end());

async function pastPlannerBooking(date: string) {
  return as(pool, "service", async (c) => {
    const { rows } = await c.query(
      `insert into bookings (venue_id, planner_id, channel, event_type, event_date, guests, rental_list_net)
       values ($1, $2, 'planner', 'wedding', $3, 100, 4500) returning id, rental_gross, deposit_amount`,
      [w.venueId, w.plannerA.plannerId, date],
    );
    return rows[0] as { id: string; rental_gross: string; deposit_amount: string };
  });
}

const pay = (bookingId: string, kind: string, amount: number) =>
  as(pool, w.admin, (c) =>
    c.query(
      `insert into payments (booking_id, kind, amount, method, status) values ($1, $2, $3, 'transfer', 'validated')`,
      [bookingId, kind, amount],
    ),
  );
const move = (id: string, to: string) =>
  as(pool, w.admin, (c) => c.query(`select public.transition_booking($1, $2)`, [id, to]));

describe("comisión automática (OASIS.md §13)", () => {
  it("se devenga sola al marcar realizado con el evento cobrado al 100 %", async () => {
    const b = await pastPlannerBooking("2026-09-05");
    await pay(b.id, "deposit", Number(b.deposit_amount));
    await move(b.id, "reserved");
    await pay(b.id, "balance", Number(b.rental_gross) - Number(b.deposit_amount));
    await as(pool, w.admin, (c) =>
      c.query(`update bookings set contract_signed_at = now() where id = $1`, [b.id]),
    );
    await move(b.id, "confirmed");
    await move(b.id, "done");
    const [c] = (
      await as(pool, "service", (cl) =>
        cl.query(
          `select base_net::float8, rate::float8, amount::float8, status from commissions where booking_id = $1`,
          [b.id],
        ),
      )
    ).rows;
    expect(c).toEqual({ base_net: 4500, rate: 0.05, amount: 225, status: "accrued" });
  });

  it("si el saldo se valida después de realizado, se devenga en ese momento", async () => {
    const b = await pastPlannerBooking("2026-09-12");
    await pay(b.id, "deposit", Number(b.rental_gross)); // pagado completo como adelanto
    await move(b.id, "reserved");
    await as(pool, w.admin, (c) =>
      c.query(`update bookings set contract_signed_at = now() where id = $1`, [b.id]),
    );
    await move(b.id, "confirmed");
    // Se devuelve parte vía ajuste: simulamos evento realizado sin comisión previa
    await as(pool, "service", (c) =>
      c.query(`delete from commissions where booking_id = $1`, [b.id]),
    );
    await move(b.id, "done");
    const n = (
      await as(pool, "service", (c) =>
        c.query(`select count(*)::int as n from commissions where booking_id = $1`, [b.id]),
      )
    ).rows[0].n;
    expect(n).toBe(1);
  });

  it("validar el pago de garantía la deja retenida", async () => {
    const b = await pastPlannerBooking("2026-09-19");
    await pay(b.id, "guarantee", 1000);
    const [g] = (
      await as(pool, "service", (c) =>
        c.query(`select amount::float8, status from guarantees where booking_id = $1`, [b.id]),
      )
    ).rows;
    expect(g).toEqual({ amount: 1000, status: "held" });
  });
});
