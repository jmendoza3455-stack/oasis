// Lighthouse móvil sobre la web pública (OASIS.md §13: rendimiento y accesibilidad ≥ 90).
// Uso: pnpm start & node scripts/lighthouse.mjs [baseUrl]
// Además de los puntajes, exige SEO y buenas prácticas, y presupuestos de las métricas que Google
// usa para posicionar (LCP, CLS) y de bloqueo del hilo principal (TBT, que anticipa el INP).
// LH_MIN_PERF y LH_MAX_LCP permiten aflojar en CI por el ruido de las máquinas compartidas.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const minPerf = Number(process.env.LH_MIN_PERF ?? 90);
const minA11y = 90;
const minSeo = 95;
const minBestPractices = 90;
// Presupuestos de laboratorio con margen (el LCP de una misma página varía ±0.5 s entre corridas en
// máquinas compartidas): detectan regresiones. La meta de Google (LCP ≤ 2.5 s, INP ≤ 200 ms en el
// p75) se mide con visitantes reales: components/public/web-vitals.tsx → GA4.
const maxLcp = Number(process.env.LH_MAX_LCP ?? 3000); // ms
const maxCls = 0.1;
const maxTbt = 400; // ms
const dir = mkdtempSync(path.join(tmpdir(), "lh-"));
let failed = false;
const passed = new Set();
const attempts = new Set();

const routes = ["/", "/bodas", "/corporativo", "/full-day", "/planners"];
// Calentamiento: en producción la CDN sirve las páginas ya generadas; el primer acceso a un
// servidor recién iniciado no representa lo que ve un visitante
for (const route of routes)
  await fetch(base + route)
    .then((r) => r.text())
    .catch(() => {});
// Cada ruta se mide hasta 2 veces y vale el mejor resultado (ruido de máquinas compartidas)
for (const route of routes.flatMap((r) => [r, r])) {
  if (passed.has(route)) continue;
  const isRetry = attempts.has(route);
  attempts.add(route);
  const out = path.join(dir, `${route.replaceAll("/", "_") || "home"}-${isRetry ? 2 : 1}.json`);
  try {
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
      { stdio: "pipe" },
    );
  } catch (error) {
    const msg = String(error.stderr ?? error.message)
      .slice(-600)
      .replaceAll("\n", " ");
    console.log(
      `${process.env.GITHUB_ACTIONS ? "::error::" : ""}Lighthouse falló en ${route}: ${msg}`,
    );
    failed = true;
    continue;
  }
  const { categories: c, audits: a } = JSON.parse(readFileSync(out, "utf8"));
  const s = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const lcp = Math.round(a["largest-contentful-paint"].numericValue);
  const cls = Math.round(a["cumulative-layout-shift"].numericValue * 1000) / 1000;
  const tbt = Math.round(a["total-blocking-time"].numericValue);
  const misses = [
    s.performance < minPerf && `rendimiento < ${minPerf}`,
    s.accessibility < minA11y && `accesibilidad < ${minA11y}`,
    s.seo < minSeo && `SEO < ${minSeo}`,
    s["best-practices"] < minBestPractices && `buenas prácticas < ${minBestPractices}`,
    lcp > maxLcp && `LCP > ${maxLcp} ms`,
    cls > maxCls && `CLS > ${maxCls}`,
    tbt > maxTbt && `TBT > ${maxTbt} ms`,
  ].filter(Boolean);
  const ok = misses.length === 0;
  if (ok) passed.add(route);
  else if (!isRetry) continue;
  failed ||= !ok;
  console.log(
    `${ok ? "✓" : "✗"} ${route.padEnd(13)} rendimiento ${s.performance} · accesibilidad ${s.accessibility} · buenas prácticas ${s["best-practices"]} · SEO ${s.seo} · LCP ${lcp} ms · CLS ${cls} · TBT ${tbt} ms${ok ? "" : ` → ${misses.join(", ")}`}`,
  );
}
process.exit(failed ? 1 : 0);
