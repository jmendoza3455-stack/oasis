import "server-only";
import pg from "pg";

// Acceso a Postgres desde el servidor con las MISMAS reglas que PostgREST: cada operación corre
// en una transacción con SET ROLE (anon | authenticated | service_role) y el JWT del usuario en
// request.jwt.claims, así que RLS y auth.uid() aplican igual. Compatible con Supavisor en modo
// transacción (sin prepared statements con nombre).

export type DbActor =
  | { kind: "anon" }
  | { kind: "user"; userId: string }
  | { kind: "service"; actorType?: "system" | "agent"; actorName?: string };

export type Sql = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<T[]>;

const globalForPool = globalThis as unknown as { oasisPool?: pg.Pool };

function pool(): pg.Pool {
  if (!globalForPool.oasisPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL no está configurada");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    globalForPool.oasisPool = new pg.Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      ssl: local ? undefined : { rejectUnauthorized: false },
      idleTimeoutMillis: 10_000,
    });
  }
  return globalForPool.oasisPool;
}

export async function withDb<T>(actor: DbActor, fn: (sql: Sql) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  const sql: Sql = async (text, params) => (await client.query(text, params)).rows;
  try {
    await client.query("begin");
    if (actor.kind === "anon") {
      await client.query("set local role anon");
      await client.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    } else if (actor.kind === "user") {
      await client.query("set local role authenticated");
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: actor.userId, role: "authenticated" }),
      ]);
    } else {
      await client.query("set local role service_role");
      await client.query(`select set_config('oasis.actor_type', $1, true)`, [
        actor.actorType ?? "system",
      ]);
      if (actor.actorName) {
        await client.query(`select set_config('oasis.actor_name', $1, true)`, [actor.actorName]);
      }
    }
    const result = await fn(sql);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Mensaje de negocio de una excepción de Postgres (raise exception 'codigo'). */
export function dbErrorCode(error: unknown): string {
  const e = error as { message?: string; constraint?: string };
  if (e?.constraint === "occupancy_no_overlap") return "date_taken";
  const msg = e?.message ?? "";
  if (msg.includes("occupancy_no_overlap")) return "date_taken";
  return msg.split(":")[0].trim() || "unknown_error";
}
