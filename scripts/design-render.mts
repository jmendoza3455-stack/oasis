// Motor del agente diseñador: carruseles, historias y publicaciones de Google con la marca.
//
//   pnpm design:render <diseño.json> [--out <carpeta>]
//
// Deja <id>-1.png, <id>-2.png… y <id>-qa.json. Verifica en el render real que ningún texto se
// corte o se salga de su zona. Sale con código 1 si hay errores.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { designQa } from "../lib/design/qa.ts";
import { designSpecSchema, FORMATS } from "../lib/design/spec.ts";
import { designHtml } from "../lib/design/templates.ts";
import { report, type QaCheck } from "../lib/reels/qa.ts";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const specPath = args.find((a) => a.endsWith(".json"));
if (!specPath) {
  console.error("Uso: pnpm design:render <diseño.json> [--out <carpeta>]");
  process.exit(1);
}
const outIdx = args.indexOf("--out");
const outDir = path.resolve(outIdx >= 0 ? args[outIdx + 1] : path.join(root, "out", "disenos"));
mkdirSync(outDir, { recursive: true });

const parsed = designSpecSchema.safeParse(JSON.parse(readFileSync(specPath, "utf8")));
if (!parsed.success) {
  console.error("Diseño inválido:");
  for (const i of parsed.error.issues) console.error(`  · ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}
const spec = parsed.data;
const dataUri = (file: string, type: string) =>
  `data:${type};base64,${readFileSync(file).toString("base64")}`;
const font = (family: string, file: string) =>
  `@font-face{font-family:"${family}";src:url(${dataUri(path.join(root, "assets/fonts", file), "font/ttf")}) format("truetype");}`;
const images: Record<string, string> = {};
for (const s of spec.slides)
  if (s.layout === "cover" && s.image) {
    const file = path.resolve(path.dirname(specPath), s.image);
    images[s.image] = dataUri(file, file.endsWith(".png") ? "image/png" : "image/jpeg");
  }
const html = designHtml(spec, {
  fontCss:
    font("Cormorant Garamond SemiBold", "CormorantGaramond-SemiBold.ttf") +
    font("Figtree SemiBold", "Figtree-SemiBold.ttf") +
    font("Figtree ExtraBold", "Figtree-ExtraBold.ttf"),
  isotipo: dataUri(path.join(root, "assets/redes/isotipo-claro-360.png"), "image/png"),
  images,
});

const { width, height } = FORMATS[spec.format];
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
try {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // Verificación en el render: cada bloque de texto dentro de su lámina y sin desbordes
  const fit = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("section.slide")].map((slide, i) => {
      const r = slide.getBoundingClientRect();
      const cs = getComputedStyle(slide);
      const top = r.top + parseFloat(cs.paddingTop) - 2;
      const bottom = r.bottom - parseFloat(cs.paddingBottom) + 2;
      const bad = [...slide.querySelectorAll<HTMLElement>("[data-fit]")].filter((el) => {
        const b = el.getBoundingClientRect();
        return b.top < top || b.bottom > bottom || el.scrollWidth > el.clientWidth + 1;
      });
      return { slide: i + 1, overflow: bad.map((el) => (el.textContent ?? "").slice(0, 40)) };
    }),
  );
  const sections = await page.locator("section.slide").all();
  for (const [i, s] of sections.entries())
    await s.screenshot({ path: path.join(outDir, `${spec.id}-${i + 1}.png`) });
  const renderChecks: QaCheck[] = fit.map((f) => ({
    id: `fit:${f.slide}`,
    label: `Lámina ${f.slide}: todo el texto entra en su zona`,
    ok: f.overflow.length === 0,
    severity: "error",
    ...(f.overflow.length ? { detail: f.overflow.join(" · ") } : {}),
  }));
  const qa = report([...designQa(spec), ...renderChecks]);
  writeFileSync(
    path.join(outDir, `${spec.id}-qa.json`),
    JSON.stringify({ spec: spec.id, ...qa }, null, 2),
  );
  console.log(
    `${qa.ok ? "✓" : "✗"} ${spec.id} · ${sections.length} imagen(es) ${width}×${height} · puntaje técnico ${qa.score}/100`,
  );
  for (const c of qa.checks.filter((c) => !c.ok))
    console.log(
      `  ${c.severity === "error" ? "✗" : "!"} ${c.label}${c.detail ? ` (${c.detail})` : ""}`,
    );
  if (!qa.ok) process.exitCode = 1;
} finally {
  await browser.close();
}
