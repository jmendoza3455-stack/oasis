import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { as, createPool } from "./db";
import { buildWorld, type World } from "./fixtures";

// Equipo de marketing: clips del equipo en sitio y piezas de los agentes con aprobación humana.

let pool: pg.Pool;
let w: World;
let n = 0;

beforeAll(async () => {
  pool = createPool();
  w = await buildWorld(pool, "marketing");
});
afterAll(async () => pool.end());

/** Pieza creada por un agente (service_role), en revisión. */
async function piece(status = "review") {
  n += 1;
  return as(pool, "service", async (c) => {
    const { rows } = await c.query(
      `insert into public.marketing_pieces (venue_id, code, kind, title, status, caption, created_by_agent)
       values ($1, $2, 'reel', 'Estamos renovando', $3, 'Caption', 'editor') returning *`,
      [w.venueId, `r${n}`, status],
    );
    return rows[0];
  });
}
const setStatus = (actor: Parameters<typeof as>[1], id: string, status: string, extra = "") =>
  as(pool, actor, (c) =>
    c.query(`update public.marketing_pieces set status = $2 ${extra} where id = $1 returning *`, [
      id,
      status,
    ]),
  );

describe("marketing", () => {
  it("el staff sube clips a su nombre; las planners no ven nada", async () => {
    const clip = await as(pool, w.ops, async (c) => {
      const { rows } = await c.query(
        `insert into public.marketing_clips (venue_id, storage_key, filename, content_type, size_bytes, uploaded_by)
         values ($1, 'clips/piscina.mp4', 'piscina.mp4', 'video/mp4', 1000, $2) returning id`,
        [w.venueId, w.ops.sub],
      );
      return rows[0];
    });
    expect(clip.id).toBeTruthy();
    // No puede subir a nombre de otro ni superar 50 MB
    await expect(
      as(pool, w.ops, (c) =>
        c.query(
          `insert into public.marketing_clips (venue_id, storage_key, filename, content_type, size_bytes, uploaded_by)
           values ($1, 'clips/x.mp4', 'x.mp4', 'video/mp4', 10, $2)`,
          [w.venueId, w.admin.sub],
        ),
      ),
    ).rejects.toThrow();
    await expect(
      as(pool, w.ops, (c) =>
        c.query(
          `insert into public.marketing_clips (venue_id, storage_key, filename, content_type, size_bytes, uploaded_by)
           values ($1, 'clips/y.mp4', 'y.mp4', 'video/mp4', 60000000, $2)`,
          [w.venueId, w.ops.sub],
        ),
      ),
    ).rejects.toThrow();
    const seen = await as(
      pool,
      w.plannerA,
      async (c) =>
        (await c.query(`select count(*)::int as n from public.marketing_clips`)).rows[0].n,
    );
    expect(seen).toBe(0);
  });

  it("solo el admin aprueba; operaciones no puede cambiar el estado", async () => {
    const p = await piece();
    const byOps = await setStatus(w.ops, p.id, "approved");
    expect(byOps.rowCount).toBe(0); // RLS: no la ve como actualizable
    const byAdmin = await setStatus(w.admin, p.id, "approved", `, decided_by = '${w.admin.sub}'`);
    expect(byAdmin.rows[0].status).toBe("approved");
  });

  it("pedir cambios exige comentario y el agente la vuelve a enviar a revisión", async () => {
    const p = await piece();
    await expect(setStatus(w.admin, p.id, "changes")).rejects.toThrow(/feedback_required/);
    const ch = await setStatus(w.admin, p.id, "changes", `, feedback = 'Gancho más corto'`);
    expect(ch.rows[0].feedback).toBe("Gancho más corto");
    const again = await setStatus("service", p.id, "review");
    expect(again.rows[0].status).toBe("review");
  });

  it("publicar solo desde aprobada y registra la fecha; no hay saltos de estado", async () => {
    const p = await piece();
    await expect(setStatus(w.admin, p.id, "published")).rejects.toThrow(/invalid_piece_transition/);
    await setStatus(w.admin, p.id, "approved");
    const pub = await setStatus(w.admin, p.id, "published");
    expect(pub.rows[0].published_at).not.toBeNull();
    await expect(setStatus(w.admin, p.id, "review")).rejects.toThrow(/invalid_piece_transition/);
    // Las métricas se registran sobre la pieza publicada
    const m = await as(pool, w.admin, (c) =>
      c.query(
        `update public.marketing_pieces set metrics = '{"saves": 12}' where id = $1 returning metrics`,
        [p.id],
      ),
    );
    expect(m.rows[0].metrics).toEqual({ saves: 12 });
  });

  it("guarda la primera decisión de André aunque la versión se reemplace", async () => {
    const p = await piece();
    await setStatus(w.admin, p.id, "changes", `, feedback = 'Otro gancho'`);
    await setStatus("service", p.id, "review");
    await setStatus(w.admin, p.id, "approved");
    const [row] = (await setStatus("service", p.id, "discarded")).rows;
    expect(row.first_decision).toBe("changes");
    const q = await piece();
    expect((await setStatus(w.admin, q.id, "approved")).rows[0].first_decision).toBe("approved");
  });

  it("atribuye clics, leads y separaciones a la pieza; las planners no ven la atribución", async () => {
    const p = await piece();
    await as(pool, "service", async (c) => {
      for (const target of ["web", "web", "whatsapp"])
        await c.query(
          `insert into public.marketing_link_clicks (venue_id, code, network, target) values ($1, $2, 'instagram', $3)`,
          [w.venueId, p.code, target],
        );
    });
    // Lead por la web (utm_content) y lead por WhatsApp (código pieza-<código>), uno separa fecha
    const lead = (col: string, value: string) =>
      as(pool, "service", async (c) => {
        const { rows } = await c.query(
          `insert into public.leads (venue_id, client_id, channel, event_type, ${col}) values ($1, $2, 'direct', 'wedding', $3) returning id`,
          [w.venueId, w.directClientId, value],
        );
        return rows[0].id as string;
      });
    await lead("utm_content", p.code);
    const waLead = await lead("utm_campaign", `pieza-${p.code}`);
    await as(pool, w.admin, async (c) => {
      const { rows } = await c.query(
        `insert into public.bookings (venue_id, client_id, lead_id, channel, event_type, event_date, guests, rental_list_net)
         values ($1, $2, $3, 'direct', 'wedding', '2029-03-10', 80, 4000) returning id, deposit_amount`,
        [w.venueId, w.directClientId, waLead],
      );
      await c.query(
        `insert into public.payments (booking_id, kind, amount, method, status) values ($1, 'deposit', $2, 'transfer', 'validated')`,
        [rows[0].id, rows[0].deposit_amount],
      );
      await c.query(`select public.transition_booking($1, 'reserved')`, [rows[0].id]);
    });
    const view = (actor: Parameters<typeof as>[1]) =>
      as(
        pool,
        actor,
        async (c) =>
          (
            await c.query(
              `select web_clicks, whatsapp_clicks, leads, bookings from public.marketing_attribution where code = $1`,
              [p.code],
            )
          ).rows,
      );
    expect(await view(w.admin)).toEqual([
      { web_clicks: 2, whatsapp_clicks: 1, leads: 2, bookings: 1 },
    ]);
    expect(await view(w.plannerA)).toEqual([]);
    // Los clics no guardan datos personales y solo el servidor los registra
    await expect(
      as(pool, w.ops, (c) =>
        c.query(
          `insert into public.marketing_link_clicks (venue_id, code, network, target) values ($1, 'r1', 'instagram', 'web')`,
          [w.venueId],
        ),
      ),
    ).rejects.toThrow();
  });

  it("todo queda en la auditoría", async () => {
    const p = await piece();
    await setStatus(w.admin, p.id, "discarded");
    const rows = await as(
      pool,
      "service",
      async (c) =>
        (
          await c.query(
            `select action from public.audit_log where entity = 'marketing_pieces' and entity_id = $1`,
            [p.id],
          )
        ).rows,
    );
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(["insert", "update"]));
  });
});
