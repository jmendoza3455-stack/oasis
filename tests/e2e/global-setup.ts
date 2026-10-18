import { execFileSync } from "node:child_process";

// Cada corrida E2E parte de la BD local recién creada (migraciones + seed + usuarios de prueba).
export default function globalSetup() {
  if (process.env.E2E_SKIP_DB_RESET === "1") return;
  execFileSync("node", ["scripts/db-local.mts"], { stdio: "inherit" });
}
