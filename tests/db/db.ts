import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(__dirname, "../..");
export const ADMIN_URL =
  process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
export const DB_NAME = process.env.TEST_DATABASE_NAME ?? "oasis_test";

export function dbUrl() {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${DB_NAME}`;
  return url.toString();
}

/** Recrea la BD de test: stub de Supabase + todas las migraciones en orden. */
export async function resetDatabase() {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${DB_NAME} with (force)`);
  await admin.query(`create database ${DB_NAME}`);
  await admin.end();

  const client = new pg.Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    await client.query(readFileSync(path.join(ROOT, "tests/db/supabase-stub.sql"), "utf8"));
    const dir = path.join(ROOT, "supabase/migrations");
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      try {
        await client.query(readFileSync(path.join(dir, file), "utf8"));
      } catch (error) {
        throw new Error(`Migración ${file} falló: ${(error as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
}

export function createPool() {
  return new pg.Pool({ connectionString: dbUrl(), max: 10 });
}

export type Actor = { sub: string } | "anon" | "service";

/**
 * Ejecuta `fn` en una transacción con el rol y JWT que usaría Supabase/PostgREST.
 * "service" = conexión de servidor (sin RLS, sin auth.uid()).
 */
export async function as<T>(
  pool: pg.Pool,
  actor: Actor,
  fn: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (actor === "anon") {
      await client.query("set local role anon");
      await client.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    } else if (actor !== "service") {
      await client.query("set local role authenticated");
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: actor.sub, role: "authenticated" }),
      ]);
    }
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
