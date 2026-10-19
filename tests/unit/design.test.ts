import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium as pwChromium } from "@playwright/test";
import { describe, expect, it } from "vitest";
import { designQa } from "@/lib/design/qa";
import { designSpecSchema, type DesignSpecInput } from "@/lib/design/spec";
import { designHtml } from "@/lib/design/templates";

const carousel: DesignSpecInput = {
  id: "c01",
  format: "carousel",
  slides: [
    { layout: "cover", kicker: "Pachacámac", title: "Así es Oasis" },
    {
      layout: "list",
      title: "Lo que hacemos distinto",
      items: ["Un evento por día", "Fechas en la web"],
    },
    { layout: "fact", title: "72 h", body: "Pre-reserva sin costo.", source: "Configuración" },
    { layout: "cta", title: "Mira las fechas libres" },
  ],
};
const parse = (s: DesignSpecInput) => designSpecSchema.parse(s);
const failed = (s: DesignSpecInput) =>
  designQa(parse(s))
    .filter((c) => !c.ok)
    .map((c) => c.id);

describe("piezas gráficas", () => {
  it("un carrusel bien armado pasa", () => {
    expect(failed(carousel)).toEqual([]);
  });

  it("exige portada, cierre con CTA, límites de texto y fuente para las cifras", () => {
    const bad: DesignSpecInput = {
      id: "c02",
      format: "carousel",
      slides: [
        { layout: "text", title: "Somos el mejor local de Lima", body: "x".repeat(300) },
        { layout: "list", title: "Precios", items: ["Desde S/ 2,950", "b", "c", "d", "e", "f"] },
      ],
    };
    expect(failed(bad)).toEqual(
      expect.arrayContaining([
        "count",
        "first_cover",
        "last_cta",
        "body:0",
        "items:1",
        "figures",
        "no_superlatives",
      ]),
    );
    expect(
      designSpecSchema.safeParse({ ...carousel, slides: [{ layout: "fact", title: "50 %" }] })
        .success,
    ).toBe(false);
  });

  it("las plantillas escapan el texto y usan la marca", () => {
    const html = designHtml(
      parse({ ...carousel, slides: [{ layout: "cover", title: "<b>hola</b>" }] }),
      {
        fontCss: "",
        isotipo: "data:image/png;base64,",
        images: {},
      },
    );
    expect(html).toContain("&lt;b&gt;hola&lt;/b&gt;");
    expect(html).toContain("--green:#2e3b2b");
    expect(html).toContain('class="ghost"');
  });
});

// Chromium de Playwright (en CI se instala después de las pruebas unitarias: ahí se omite)
const chromium = process.env.PW_CHROMIUM_PATH || pwChromium.executablePath();
describe.skipIf(!existsSync(chromium))("render de piezas gráficas (Chromium)", () => {
  it("produce las PNG y detecta texto que no entra", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "design-test-"));
    const run = (spec: DesignSpecInput) => {
      const file = path.join(dir, `${spec.id}.json`);
      writeFileSync(file, JSON.stringify(spec));
      return spawnSync("pnpm", ["-s", "design:render", file, "--out", dir], {
        encoding: "utf8",
        env: { ...process.env, PW_CHROMIUM_PATH: chromium },
      });
    };
    const ok = run(carousel);
    expect(ok.status, ok.stderr + ok.stdout).toBe(0);
    expect(existsSync(path.join(dir, "c01-4.png"))).toBe(true);
    const long = run({
      id: "g01",
      format: "gbp",
      slides: [
        {
          layout: "text",
          title: "Título",
          body:
            "Palabra ".repeat(27).trim() +
            " superlargapalabrasinespaciosquenoentraenningunlado".repeat(3),
        },
      ],
    });
    expect(long.status).toBe(1);
    const qa = JSON.parse(readFileSync(path.join(dir, "g01-qa.json"), "utf8"));
    expect(qa.checks.find((c: { id: string }) => c.id === "fit:1").ok).toBe(false);
  }, 120_000);
});
