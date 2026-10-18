// Lighthouse móvil sobre la web pública (OASIS.md §13: rendimiento y accesibilidad ≥ 90).
// Uso: pnpm start & node scripts/lighthouse.mjs [baseUrl]
// LH_MIN_PERF permite bajar el umbral en CI por el ruido de las máquinas compartidas.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const minPerf = Number(process.env.LH_MIN_PERF ?? 90);
const minA11y = 90;
const dir = mkdtempSync(path.join(tmpdir(), "lh-"));
let failed = false;

for (const route of ["/", "/bodas", "/corporativo", "/full-day", "/planners"]) {
  const out = path.join(dir, `${route.replaceAll("/", "_") || "home"}.json`);
  execFileSync(
    "npx",
    [
      "--yes",
      "lighthouse@12",
      base + route,
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      `--output-path=${out}`,
    ],
    { stdio: "ignore" },
  );
  const { categories: c } = JSON.parse(readFileSync(out, "utf8"));
  const s = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const ok = s.performance >= minPerf && s.accessibility >= minA11y;
  failed ||= !ok;
  console.log(
    `${ok ? "✓" : "✗"} ${route.padEnd(13)} rendimiento ${s.performance} · accesibilidad ${s.accessibility} · buenas prácticas ${s["best-practices"]} · SEO ${s.seo}`,
  );
}
process.exit(failed ? 1 : 0);
