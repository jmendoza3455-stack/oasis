// Aplica supabase/migrations/*.sql pendientes a un proyecto de Supabase vía Management API
// y las registra en supabase_migrations.schema_migrations (mismo historial que usa el CLI).
//
// Uso:
//   SUPABASE_PROJECT_REF=xxxx node scripts/db-push.mts            # migraciones pendientes
//   SUPABASE_PROJECT_REF=xxxx node scripts/db-push.mts --seed     # + supabase/seed.sql
//   SUPABASE_PROJECT_REF=xxxx node scripts/db-push.mts --file scripts/reset-demo.sql
//
// Autenticación: SUPABASE_ACCESS_TOKEN (token personal sbp_...). En el entorno de Claude Code
// el proxy inyecta el header, por eso es opcional.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ref = process.env.SUPABASE_PROJECT_REF;
if (!ref) {
  console.error("Falta SUPABASE_PROJECT_REF");
  process.exit(1);
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
const root = path.resolve(import.meta.dirname, "..");

async function query<T = unknown>(sql: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
  return body ? (JSON.parse(body) as T[]) : [];
}

const literal = (s: string) => `'${s.replaceAll("'", "''")}'`;

await query(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key, statements text[], name text
  );`);

const applied = new Set(
  (
    await query<{ version: string }>(`select version from supabase_migrations.schema_migrations`)
  ).map((r) => r.version),
);

const dir = path.join(root, "supabase/migrations");
for (const file of readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
  if (applied.has(version)) {
    console.log(`= ${file} (ya aplicada)`);
    continue;
  }
  const sql = readFileSync(path.join(dir, file), "utf8");
  // Migración + registro en una sola transacción
  await query(`begin;\n${sql}\n;insert into supabase_migrations.schema_migrations (version, name, statements)
    values (${literal(version)}, ${literal(rest.join("_"))}, array[${literal(sql)}]);\ncommit;`);
  console.log(`✓ ${file}`);
}

const fileArg = process.argv.includes("--seed")
  ? "supabase/seed.sql"
  : process.argv[process.argv.indexOf("--file") + 1];
if (process.argv.includes("--seed") || process.argv.includes("--file")) {
  await query(readFileSync(path.join(root, fileArg), "utf8"));
  console.log(`✓ ${fileArg}`);
}
