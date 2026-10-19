// Motor de edición de Reels (lo usa el agente editor; ver agents/editor-video.md).
//
//   pnpm reels:render <spec.json> [--clips <carpeta>] [--out <carpeta>]
//
// Lee la especificación (lib/reels/spec.ts), busca cada clip en --clips (o junto al JSON) y deja en
// --out: <id>.mp4 (1080×1920, 30 fps, H.264, −14 LUFS), <id>-portada.jpg y <id>-qa.json.
// Sale con código 1 si el control de calidad técnico encuentra errores.
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildAss } from "../lib/reels/ass.ts";
import { concatArgs, coverArgs, endCardArgs, finalArgs, segmentArgs } from "../lib/reels/ffmpeg.ts";
import {
  parseBlackdetect,
  parseEbur128,
  parseRate,
  probeQa,
  report,
  specQa,
  type Probe,
} from "../lib/reels/qa.ts";
import { reelSpecSchema } from "../lib/reels/spec.ts";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const specPath = args.find((a) => a.endsWith(".json"));
if (!specPath) {
  console.error("Uso: pnpm reels:render <spec.json> [--clips <carpeta>] [--out <carpeta>]");
  process.exit(1);
}

const parsed = reelSpecSchema.safeParse(JSON.parse(readFileSync(specPath, "utf8")));
if (!parsed.success) {
  console.error("Especificación inválida:");
  for (const i of parsed.error.issues) console.error(`  · ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}
const spec = parsed.data;
const clipsDir = path.resolve(opt("--clips") ?? path.dirname(specPath));
const outDir = path.resolve(opt("--out") ?? path.join(root, "out", "reels"));
mkdirSync(outDir, { recursive: true });
const work = mkdtempSync(path.join(tmpdir(), `reel-${spec.id}-`));

const ffmpeg = (a: string[], cwd = work) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...a], {
    cwd,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`ffmpeg falló: ${r.stderr}`);
};
const ffmpegLog = (a: string[]) =>
  spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...a], { cwd: work, encoding: "utf8" }).stderr;
const hasAudio = (file: string) =>
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=index",
      "-of",
      "csv=p=0",
      file,
    ],
    {
      encoding: "utf8",
    },
  ).trim().length > 0;

try {
  // 1. Cortes
  const segments: string[] = [];
  spec.clips.forEach((clip, i) => {
    const src = path.isAbsolute(clip.src) ? clip.src : path.join(clipsDir, clip.src);
    if (!existsSync(src)) throw new Error(`No encuentro el clip ${clip.src} en ${clipsDir}`);
    const out = `seg-${i}.mp4`;
    ffmpeg(segmentArgs(clip, src, hasAudio(src), out));
    segments.push(out);
  });
  // 2. Cierre con logo
  if (spec.endCard) {
    ffmpeg(endCardArgs(path.join(root, "assets/redes/isotipo-claro-360.png"), "end.mp4"));
    segments.push("end.mp4");
  }
  // 3. Unión, 4. textos y volumen, 5. portada
  writeFileSync(path.join(work, "list.txt"), segments.map((s) => `file '${s}'`).join("\n"));
  ffmpeg(concatArgs("list.txt", "joined.mp4"));
  writeFileSync(path.join(work, "reel.ass"), buildAss(spec));
  const video = path.join(outDir, `${spec.id}.mp4`);
  ffmpeg(finalArgs("joined.mp4", "reel.ass", path.join(root, "assets/fonts"), video));
  ffmpeg(coverArgs(video, spec.coverAt, path.join(outDir, `${spec.id}-portada.jpg`)));

  // 6. Control de calidad técnico sobre el archivo final
  const info = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate:format=duration",
        "-of",
        "json",
        video,
      ],
      { encoding: "utf8" },
    ),
  ) as { streams: Record<string, string>[]; format: { duration: string } };
  const v = info.streams.find((s) => s.codec_type === "video")!;
  const a = info.streams.find((s) => s.codec_type === "audio");
  const loud = parseEbur128(
    ffmpegLog(["-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"]),
  );
  const probe: Probe = {
    width: Number(v.width),
    height: Number(v.height),
    fps: parseRate(v.r_frame_rate),
    vcodec: v.codec_name,
    pixfmt: v.pix_fmt,
    acodec: a?.codec_name ?? null,
    sampleRate: a ? Number(a.sample_rate) : null,
    duration: Number(info.format.duration),
    sizeBytes: statSync(video).size,
    lufs: loud.lufs,
    truePeak: loud.truePeak,
    black: parseBlackdetect(
      ffmpegLog(["-i", video, "-vf", "blackdetect=d=0.4:pix_th=0.10", "-an", "-f", "null", "-"]),
    ),
  };
  const qa = report([...specQa(spec), ...probeQa(probe, spec)]);
  writeFileSync(
    path.join(outDir, `${spec.id}-qa.json`),
    JSON.stringify({ spec: spec.id, probe, ...qa }, null, 2),
  );

  console.log(
    `${qa.ok ? "✓" : "✗"} ${spec.id} · puntaje técnico ${qa.score}/100 · ${probe.duration.toFixed(1)} s · ${(probe.sizeBytes / 1048576).toFixed(1)} MB`,
  );
  for (const c of qa.checks.filter((c) => !c.ok))
    console.log(
      `  ${c.severity === "error" ? "✗" : "!"} ${c.label}${c.detail ? ` (${c.detail})` : ""}`,
    );
  console.log(`  → ${path.relative(process.cwd(), video)}`);
  if (!qa.ok) process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
