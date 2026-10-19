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
