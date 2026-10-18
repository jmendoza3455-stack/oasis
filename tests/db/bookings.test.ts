import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { as, createPool } from "./db";
import { buildWorld, nextDate, type World } from "./fixtures";

let pool: pg.Pool;
let w: World;

beforeAll(async () => {
  pool = createPool();
  w = await buildWorld(pool, "bookings");
});
afterAll(async () => pool.end());

async function staffBooking(date: string, extra: Record<string, unknown> = {}) {
  const cols = [
    "venue_id",
    "client_id",
    "channel",
    "event_type",
    "event_date",
    "guests",
    ...Object.keys(extra),
  ];
  const vals = [
    w.venueId,
    w.directClientId,
    "direct",
    "wedding",
    date,
    100,
    ...Object.values(extra),
  ];
  return as(pool, w.ops, async (c) => {
    const { rows } = await c.query(
      `insert into public.bookings (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning *`,
      vals,
    );
    return rows[0];
  });
}

describe("una sola reserva activa por fecha (OASIS.md §13)", () => {
  it("dos reservas concurrentes de la misma fecha: solo una prospera", async () => {
    const date = nextDate();
    const results = await Promise.allSettled([staffBooking(date), staffBooking(date)]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(String(failed[0].reason.message)).toMatch(/occupancy_no_overlap/);
  });

  it("un bloqueo impide reservar y una reserva impide bloquear", async () => {
    const date = nextDate();
    await as(pool, w.ops, (c) =>
      c.query(
        `insert into public.blocks (venue_id, starts_on, ends_on, reason) values ($1, $2, $2, 'Mantenimiento piscina')`,
        [w.venueId, date],
      ),
    );
    await expect(staffBooking(date)).rejects.toThrow(/occupancy_no_overlap/);

    const date2 = nextDate();
    await staffBooking(date2);
    await expect(
      as(pool, w.ops, (c) =>
        c.query(
          `insert into public.blocks (venue_id, starts_on, ends_on, reason) values ($1, $2, $2, 'x')`,
          [w.venueId, date2],
        ),
      ),
    ).rejects.toThrow(/occupancy_no_overlap/);
  });

  it("cancelar libera la fecha", async () => {
    const date = nextDate();
    const b = await staffBooking(date);
    await as(pool, w.admin, (c) =>
      c.query(`select public.transition_booking($1, 'cancelled', 'Cliente desistió')`, [b.id]),
    );
    await expect(staffBooking(date)).resolves.toBeTruthy();
  });
});

describe("holds de 72 h", () => {
  it("la pre-reserva vence a las 72 h y la fecha vuelve a Libre sola", async () => {
    const date = nextDate();
    const hold = await as(pool, w.plannerA, async (c) => {
      const { rows } = await c.query(`select * from public.create_hold($1, $2, 'wedding', 80)`, [
        w.venueId,
        date,
      ]);
      return rows[0];
    });
    const hours = (new Date(hold.hold_expires_at).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(71.9);
    expect(hours).toBeLessThanOrEqual(72);

    const status = async () =>
      as(pool, w.plannerB, async (c) => {
        const { rows } = await c.query(`select status from public.get_availability($1, $2, $2)`, [
          w.venueId,
          date,
        ]);
        return rows[0].status;
      });
    expect(await status()).toBe("prebooked");

    // Simula el paso de 72 h
    await as(pool, "service", (c) =>
      c.query(
        `update public.bookings set hold_expires_at = now() - interval '1 minute' where id = $1`,
        [hold.id],
      ),
    );
    expect(await status()).toBe("free");

    const expired = await as(pool, "service", async (c) => {
      await c.query(`select set_config('oasis.actor_type', 'system', true)`);
      const { rows } = await c.query(`select public.expire_stale_holds() as n`);
      return rows[0].n;
    });
    expect(expired).toBeGreaterThanOrEqual(1);
    const after = await as(pool, "service", async (c) => {
      const b = await c.query(`select status from public.bookings where id = $1`, [hold.id]);
      const o = await c.query(
        `select count(*)::int as n from public.occupancy where source_id = $1`,
        [hold.id],
      );
      return { status: b.rows[0].status, occ: o.rows[0].n };
    });
    expect(after).toEqual({ status: "expired", occ: 0 });
  });

  it("un hold vencido no bloquea aunque el cron no haya pasado", async () => {
    const date = nextDate();
    const hold = await as(pool, w.plannerA, async (c) => {
      const { rows } = await c.query(`select * from public.create_hold($1, $2, 'social', 50)`, [
        w.venueId,
        date,
      ]);
      return rows[0];
    });
    await as(pool, "service", (c) =>
      c.query(
        `update public.bookings set hold_expires_at = now() - interval '1 second' where id = $1`,
        [hold.id],
      ),
    );
    await expect(staffBooking(date)).resolves.toBeTruthy();
  });

  it("máximo 2 holds activos por planner", async () => {
    const create = (date: string) =>
      as(pool, w.plannerB, (c) =>
        c.query(`select public.create_hold($1, $2, 'corporate', 40)`, [w.venueId, date]),
      );
    await create(nextDate());
    await create(nextDate());
    await expect(create(nextDate())).rejects.toThrow(/max_active_holds_reached/);
  });
});

describe("máquina de estados en BD", () => {
  it("no se puede cambiar el estado sin pasar por transition_booking", async () => {
    const b = await staffBooking(nextDate());
    await expect(
      as(pool, w.admin, (c) =>
        c.query(`update public.bookings set status = 'reserved' where id = $1`, [b.id]),
      ),
    ).rejects.toThrow(/status_change_requires_transition/);
  });

  it("transiciones inválidas se rechazan", async () => {
    const b = await staffBooking(nextDate());
    await expect(
      as(pool, w.admin, (c) => c.query(`select public.transition_booking($1, 'done')`, [b.id])),
    ).rejects.toThrow(/invalid_transition/);
  });

  it("Separada exige adelanto validado por el admin; ops no puede validar pagos", async () => {
    const b = await staffBooking(nextDate(), { rental_list_net: 5000 });
    expect(Number(b.rental_gross)).toBe(5900);
    expect(Number(b.deposit_amount)).toBe(2950);
    expect(Number(b.guarantee_amount)).toBe(1000);

    await expect(
      as(pool, w.admin, (c) => c.query(`select public.transition_booking($1, 'reserved')`, [b.id])),
    ).rejects.toThrow(/deposit_not_validated/);

    const payment = await as(pool, w.ops, async (c) => {
      const { rows } = await c.query(
        `insert into public.payments (booking_id, kind, amount, method) values ($1, 'deposit', 2950, 'yape') returning id`,
        [b.id],
      );
      return rows[0].id;
    });
    const byOps = await as(pool, w.ops, (c) =>
      c.query(`update public.payments set status = 'validated' where id = $1`, [payment]),
    );
    expect(byOps.rowCount).toBe(0); // RLS: ops no puede actualizar pagos

    await as(pool, w.admin, (c) =>
      c.query(`update public.payments set status = 'validated' where id = $1`, [payment]),
    );
    const reserved = await as(pool, w.admin, async (c) => {
      const { rows } = await c.query(`select (public.transition_booking($1, 'reserved')).status`, [
        b.id,
      ]);
      return rows[0].status;
    });
    expect(reserved).toBe("reserved");

    const audit = await as(pool, "service", async (c) => {
      const { rows } = await c.query(
        `select before->>'status' as before, after->>'status' as after, actor_id
           from public.audit_log where entity = 'bookings' and entity_id = $1 and action = 'update'
          order by id desc limit 1`,
        [b.id],
      );
      return rows[0];
    });
    expect(audit).toEqual({ before: "prebooked", after: "reserved", actor_id: w.admin.sub });
  });

  it("descuento sobre el tope requiere aprobación del admin", async () => {
    await expect(
      staffBooking(nextDate(), { rental_list_net: 4000, discount_pct: 15 }),
    ).rejects.toThrow(/discount_over_cap_requires_approval/);
    await expect(
      staffBooking(nextDate(), {
        rental_list_net: 4000,
        discount_pct: 15,
        discount_approved_by: w.ops.sub,
      }),
    ).rejects.toThrow(/discount_approval_requires_admin/);
    const ok = await staffBooking(nextDate(), { rental_list_net: 4000, discount_pct: 8 });
    expect(Number(ok.rental_net)).toBe(3680);
    expect(Number(ok.rental_igv)).toBe(662.4);
  });

  it("cancelar exige motivo", async () => {
    const b = await staffBooking(nextDate());
    await expect(
      as(pool, w.admin, (c) =>
        c.query(`select public.transition_booking($1, 'cancelled')`, [b.id]),
      ),
    ).rejects.toThrow(/cancel_reason_required/);
  });
});

describe("rango horario", () => {
  it("evento noche cruza la medianoche en modo franjas", async () => {
    const r = await as(pool, "service", async (c) => {
      await c.query(
        `insert into public.settings (venue_id, key, value) values ($1, 'booking_mode', '"slots"')
         on conflict (venue_id, key) do update set value = excluded.value`,
        [w.venueId],
      );
      const { rows } = await c.query(
        `select lower(r) at time zone 'America/Lima' as lo, upper(r) at time zone 'America/Lima' as hi
           from public.booking_range($1, '2027-02-13', 'night') r`,
        [w.venueId],
      );
      await c.query(
        `update public.settings set value = '"one_per_day"' where venue_id = $1 and key = 'booking_mode'`,
        [w.venueId],
      );
      return rows[0];
    });
    expect(new Date(r.lo).toISOString()).toContain("2027-02-13T19:00");
    expect(new Date(r.hi).toISOString()).toContain("2027-02-14T03:00");
  });
});
