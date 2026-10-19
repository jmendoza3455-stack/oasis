// BD local para desarrollo y E2E: stub de Supabase + migraciones + seed + usuarios de prueba.
// Uso: node scripts/db-local.mts   (DATABASE_ADMIN_URL y LOCAL_DB_NAME opcionales)
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const adminUrl =
  process.env.DATABASE_ADMIN_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const dbName = process.env.LOCAL_DB_NAME ?? "oasis_dev";
const appPassword = process.env.LOCAL_APP_PASSWORD ?? "oasis_local";

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`drop database if exists ${dbName} with (force)`);
await admin.query(`create database ${dbName}`);
await admin.end();

const url = new URL(adminUrl);
url.pathname = `/${dbName}`;
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
await db.query(readFileSync(path.join(root, "tests/db/supabase-stub.sql"), "utf8"));
for (const f of readdirSync(path.join(root, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  await db.query(readFileSync(path.join(root, "supabase/migrations", f), "utf8"));
}
await db.query(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
await db.query(`alter role oasis_app password '${appPassword}'`);

// Usuarios de prueba (solo local): admin, ops y un usuario por planner demo
await db.query(`
  insert into auth.users (email, raw_app_meta_data) values
    ('admin@demo.oasis.test', '{"role":"admin"}'),
    ('ops@demo.oasis.test', '{"role":"ops"}');
  insert into auth.users (email, raw_app_meta_data)
  select replace(email, 'planner', 'usuario.planner'), jsonb_build_object('role', 'planner', 'planner_id', id)
    from public.planners where email like '%@demo.oasis.test';
  insert into public.planner_agreements (planner_id, version, accepted_by)
  select p.planner_id, '2026-10', p.id from public.profiles p
   where p.role = 'planner' and p.planner_id = (select id from public.planners order by business_name limit 1);
`);
// Demo local/CI: precios públicos visibles para probar el cotizador (en producción quedan
// apagados hasta validar el tarifario, S24)
await db.query(`update public.settings set value = 'true' where key = 'public_prices_enabled'`);
await db.end();

url.username = "oasis_app";
url.password = appPassword;
console.log(`✓ BD local "${dbName}" lista`);
console.log(`DATABASE_URL=${url.toString()}`);
