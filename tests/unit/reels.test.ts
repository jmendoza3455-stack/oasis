import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assText, assTime, buildAss, SAFE, STYLES } from "@/lib/reels/ass";
import { segmentArgs } from "@/lib/reels/ffmpeg";
import {
  parseBlackdetect,
  parseEbur128,
  parseRate,
  probeQa,
  report,
  specQa,
  type Probe,
} from "@/lib/reels/qa";
import { reelSpecSchema, timeline, type ReelSpecInput } from "@/lib/reels/spec";

const base: ReelSpecInput = {
  id: "r01-obra",
  title: "Estamos renovando",
  clips: [
    { src: "a.mp4", in: 0, out: 6 },
    { src: "b.mp4", in: 2, out: 8, speed: 1.5 },
    { src: "c.mp4", in: 0, out: 6 },
  ],
  overlays: [
    { text: "Estamos renovando una casa de campo", start: 0, end: 3, style: "hook" },
    { text: "Jardín, terraza y piscina", start: 4, end: 7, style: "caption" },
    { text: "Separa tu fecha de verano", start: 12, end: 15.5, style: "cta" },
  ],
  coverAt: 1,
};
const spec = (over: Partial<ReelSpecInput> = {}) => reelSpecSchema.parse({ ...base, ...over });
const failed = (checks: ReturnType<typeof specQa>) => checks.filter((c) => !c.ok).map((c) => c.id);

describe("especificación del Reel", () => {
  it("calcula la línea de tiempo con velocidad y cierre", () => {
    expect(timeline(spec())).toEqual({ main: 16, endCardStart: 16, total: 18.5 });
    expect(timeline(spec({ endCard: null })).total).toBe(16);
  });

  it("rechaza ids, cortes y textos inválidos", () => {
    expect(reelSpecSchema.safeParse({ ...base, id: "R 1" }).success).toBe(false);
    expect(
      reelSpecSchema.safeParse({ ...base, clips: [{ src: "a", in: 2, out: 2.2 }] }).success,
    ).toBe(false);
    expect(
      reelSpecSchema.safeParse({
        ...base,
        overlays: [{ text: "x", start: 3, end: 2, style: "hook" }],
      }).success,
    ).toBe(false);
  });
});

describe("subtítulos ASS con la marca", () => {
  it("formatea tiempos y limpia el texto", () => {
    expect(assTime(0)).toBe("0:00:00.00");
    expect(assTime(75.456)).toBe("0:01:15.46");
    expect(assText("Hola {malo}\\ y\nchau", "caption")).toBe("Hola malo y\\Nchau");
    expect(assText("obra en curso", "kicker")).toBe("OBRA EN CURSO");
  });

  it("usa las fuentes de la marca, respeta las zonas seguras y agrega el cierre", () => {
    const ass = buildAss(spec());
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("Style: hook,Cormorant Garamond SemiBold,");
    expect(ass).toContain("Style: caption,Figtree SemiBold,");
    expect(STYLES.caption.marginV).toBeGreaterThanOrEqual(SAFE.bottom);
    expect(STYLES.hook.marginV).toBeGreaterThanOrEqual(SAFE.top);
    expect(ass).toMatch(/Dialogue: 0,0:00:16\.00,0:00:18\.50,endTitle,.*Oasis Pachacámac/);
    expect(ass).toContain("Link en la bio");
    expect(buildAss(spec({ endCard: null }))).not.toContain("endTitle,,");
  });
});

describe("control de calidad del guion", () => {
  it("un Reel bien armado pasa", () => {
    const r = report(specQa(spec()));
    expect(r.ok).toBe(true);
    expect(failed(r.checks)).toEqual([]);
    expect(r.score).toBe(100);
  });

  it("detecta gancho tardío, textos ilegibles, superposiciones y cifras", () => {
    const checks = specQa(
      spec({
        overlays: [
          { text: "Gancho que llega tarde", start: 2.5, end: 5, style: "hook" },
          {
            text: "Un texto larguísimo que nadie alcanza a leer en tan poco tiempo",
            start: 5,
            end: 6,
            style: "caption",
          },
          { text: "Desde S/ 2,950", start: 5.5, end: 8, style: "cta" },
          { text: "Antes", start: 0.4, end: 0.9, style: "caption" },
        ],
        coverAt: 0,
      }),
    );
    expect(failed(checks)).toEqual(
      expect.arrayContaining([
        "hook_2s",
        "cps:5",
        "on_screen:0.4",
        "overlap:5:5.5",
        "figures",
        "cover",
      ]),
    );
    expect(report(checks).ok).toBe(false);
  });

  it("exige duración razonable y llamado a la acción", () => {
    const corto = spec({ clips: [{ src: "a", in: 0, out: 3 }], overlays: [], endCard: null });
    expect(failed(specQa(corto))).toEqual(expect.arrayContaining(["duration", "hook_2s", "cta"]));
  });
});

describe("control de calidad del archivo", () => {
  const ok: Probe = {
    width: 1080,
    height: 1920,
    fps: 30,
    vcodec: "h264",
    pixfmt: "yuv420p",
    acodec: "aac",
    sampleRate: 48000,
    duration: 18.5,
    sizeBytes: 9e6,
    lufs: -14,
    truePeak: -2,
    black: [],
  };
  it("acepta un archivo correcto y marca los defectos", () => {
    expect(probeQa(ok, spec()).every((c) => c.ok)).toBe(true);
    const bad = probeQa(
      { ...ok, width: 720, fps: 25, lufs: -9, black: [{ start: 2, end: 3 }] },
      spec(),
    );
    expect(bad.filter((c) => !c.ok).map((c) => c.id)).toEqual(["res", "fps", "loudness", "black"]);
    const silent = probeQa({ ...ok, lufs: null }, spec()).find((c) => c.id === "loudness")!;
    expect(silent).toMatchObject({ ok: false, severity: "warning" });
  });

  it("lee la salida de ffprobe y ffmpeg", () => {
    expect(parseRate("30000/1001")).toBe(29.97);
    expect(parseRate("30/1")).toBe(30);
    expect(
      parseEbur128(
        "…\nSummary:\n  Integrated loudness:\n    I:         -14.1 LUFS\n  True peak:\n    Peak:       -1.8 dBFS",
      ),
    ).toEqual({ lufs: -14.1, truePeak: -1.8 });
    expect(parseEbur128("Summary:\n I: -inf LUFS\n Peak: -inf dBFS")).toEqual({
      lufs: null,
      truePeak: null,
    });
    expect(
      parseBlackdetect("[blackdetect] black_start:1.2 black_end:1.9 black_duration:0.7"),
    ).toEqual([{ start: 1.2, end: 1.9 }]);
  });

  it("los cortes usan audio del clip o silencio, y el zoom solo si se pide", () => {
    const s = spec({ clips: [{ src: "a.mp4", in: 1, out: 4, motion: "zoom-in" }] });
    const withAudio = segmentArgs(s.clips[0], "a.mp4", true, "o.mp4").join(" ");
    expect(withAudio).toContain("[0:a]asetpts");
    expect(withAudio).toContain("eval=frame");
    const silent = segmentArgs({ ...s.clips[0], motion: "none" }, "a.mp4", false, "o.mp4").join(
      " ",
    );
    expect(silent).toContain("[1:a]anull[a]");
    expect(silent).not.toContain("eval=frame");
  });
});

// Render real con ffmpeg (clips sintéticos generados aquí; nunca material del local)
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
describe.skipIf(!hasFfmpeg)("motor de render (ffmpeg)", () => {
  it("produce un MP4 vertical apto para redes con portada y reporte de calidad", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "reels-test-"));
    const gen = (args: string[]) =>
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: dir });
    gen([
      "-f",
      "lavfi",
      "-i",
      "testsrc2=s=640x360:r=30:d=5",
      "-f",
      "lavfi",
      "-i",
      "sine=f=440:d=5",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "a.mp4",
    ]);
    gen([
      "-f",
      "lavfi",
      "-i",
      "testsrc=s=360x640:r=25:d=5",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "b.mp4",
    ]);
    const input: ReelSpecInput = {
      id: "prueba",
      title: "Prueba",
      clips: [
        { src: "a.mp4", in: 0, out: 4.5, motion: "zoom-in" },
        { src: "b.mp4", in: 0, out: 4 },
      ],
      overlays: [
        { text: "Gancho de prueba", start: 0, end: 3, style: "hook" },
        { text: "Llamado de prueba", start: 5, end: 8, style: "cta" },
      ],
      coverAt: 1,
    };
    writeFileSync(path.join(dir, "spec.json"), JSON.stringify(input));
    const r = spawnSync(
      "pnpm",
      ["-s", "reels:render", path.join(dir, "spec.json"), "--out", path.join(dir, "out")],
      { encoding: "utf8" },
    );
    expect(r.status, r.stderr + r.stdout).toBe(0);
    const qa = JSON.parse(readFileSync(path.join(dir, "out", "prueba-qa.json"), "utf8"));
    expect(qa.probe).toMatchObject({
      width: 1080,
      height: 1920,
      fps: 30,
      vcodec: "h264",
      acodec: "aac",
      black: [],
    });
    expect(qa.probe.duration).toBeCloseTo(11, 0);
    expect(qa.probe.lufs).toBeGreaterThanOrEqual(-16);
    expect(qa.ok).toBe(true);
    expect(() => readFileSync(path.join(dir, "out", "prueba-portada.jpg"))).not.toThrow();
  }, 180_000);
});
