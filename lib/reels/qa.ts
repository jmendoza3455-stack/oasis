import { REEL, timeline, type Overlay, type ReelSpec } from "./spec";

// Control de calidad técnico de cada Reel: lo que se puede medir sin opinar. La revisión
// editorial (gancho, tono, veracidad) la hace el agente director creativo con su rúbrica.

export type QaCheck = {
  id: string;
  label: string;
  ok: boolean;
  severity: "error" | "warning";
  detail?: string;
};
export type QaReport = { ok: boolean; score: number; checks: QaCheck[] };

/** Velocidad de lectura máxima (caracteres por segundo), estándar de subtítulos. */
export const MAX_CPS = 17;
const ZONE: Record<Overlay["style"], "top" | "bottom"> = {
  kicker: "top",
  hook: "top",
  caption: "bottom",
  cta: "bottom",
};

const check = (
  id: string,
  label: string,
  ok: boolean,
  severity: QaCheck["severity"] = "error",
  detail?: string,
): QaCheck => ({ id, label, ok, severity, ...(detail && !ok ? { detail } : {}) });

export function specQa(spec: ReelSpec): QaCheck[] {
  const t = timeline(spec);
  const ov = [...spec.overlays].sort((a, b) => a.start - b.start);
  const checks: QaCheck[] = [];

  checks.push(
    check(
      "duration",
      "Dura entre 7 y 60 s",
      t.total >= 7 && t.total <= 60,
      "error",
      `${t.total} s`,
    ),
    check(
      "duration_ideal",
      "Dura entre 12 y 35 s (lo que mejor retiene)",
      t.total >= 12 && t.total <= 35,
      "warning",
      `${t.total} s`,
    ),
  );

  const hook = ov.find((o) => o.style === "hook");
  checks.push(
    check(
      "hook_2s",
      "Gancho en pantalla en los primeros 2 s",
      Boolean(hook && hook.start <= 0.5 && hook.end >= 2),
      "error",
      hook ? `aparece a los ${hook.start} s y dura hasta ${hook.end} s` : "no hay texto de gancho",
    ),
  );
  if (hook)
    checks.push(
      check(
        "hook_short",
        "Gancho de 50 caracteres o menos",
        hook.text.length <= 50,
        "warning",
        `${hook.text.length} caracteres`,
      ),
    );

  for (const o of ov) {
    const dur = o.end - o.start;
    const cps = o.text.replace(/\s+/g, " ").length / dur;
    checks.push(
      check(
        `on_screen:${o.start}`,
        `"${short(o.text)}" dura al menos 1 s`,
        dur >= 1,
        "error",
        `${dur.toFixed(2)} s`,
      ),
      check(
        `cps:${o.start}`,
        `"${short(o.text)}" se alcanza a leer (≤ ${MAX_CPS} caracteres/s)`,
        cps <= MAX_CPS,
        cps > 25 ? "error" : "warning",
        `${cps.toFixed(1)} caracteres/s`,
      ),
    );
    if (o.end > t.main + 0.01)
      checks.push(
        check(
          `inside:${o.start}`,
          `"${short(o.text)}" termina antes del cierre`,
          false,
          "warning",
          `termina a los ${o.end} s; el video principal dura ${t.main} s`,
        ),
      );
  }

  // Dos textos en la misma zona al mismo tiempo se tapan (salvo antetítulo + gancho, que van en líneas distintas)
  for (let i = 0; i < ov.length; i++)
    for (let j = i + 1; j < ov.length; j++) {
      const a = ov[i];
      const b = ov[j];
      const pair = new Set([a.style, b.style]);
      const allowed = pair.has("kicker") && pair.has("hook");
      if (ZONE[a.style] === ZONE[b.style] && !allowed && b.start < a.end)
        checks.push(
          check(
            `overlap:${a.start}:${b.start}`,
            `"${short(a.text)}" y "${short(b.text)}" no se superponen`,
            false,
          ),
        );
    }

  checks.push(
    check(
      "cta",
      "Tiene llamado a la acción (texto CTA o cierre con logo)",
      ov.some((o) => o.style === "cta") || spec.endCard !== null,
    ),
    check(
      "cover",
      "La portada muestra el gancho",
      Boolean(hook && spec.coverAt >= hook.start && spec.coverAt <= hook.end),
      "warning",
      `portada a los ${spec.coverAt} s`,
    ),
  );

  // Regla 10: toda cifra en pantalla se verifica contra settings/tarifario antes de publicar
  const numbers = ov.filter((o) => /\d/.test(o.text)).map((o) => short(o.text));
  checks.push(
    check(
      "figures",
      "Cifras en pantalla verificadas contra la web o settings",
      numbers.length === 0,
      "warning",
      `verificar: ${numbers.join(" · ")}`,
    ),
  );
  return checks;
}

export type Probe = {
  width: number;
  height: number;
  fps: number;
  vcodec: string;
  pixfmt: string;
  acodec: string | null;
  sampleRate: number | null;
  duration: number;
  sizeBytes: number;
  /** LUFS integrados (null si no se midió). */
  lufs: number | null;
  truePeak: number | null;
  /** Tramos negros de más de 0.4 s. */
  black: { start: number; end: number }[];
};

export function probeQa(probe: Probe, spec: ReelSpec): QaCheck[] {
  const t = timeline(spec);
  const silent = probe.lufs === null || probe.lufs < -40;
  return [
    check(
      "res",
      "Vertical 1080×1920",
      probe.width === REEL.width && probe.height === REEL.height,
      "error",
      `${probe.width}×${probe.height}`,
    ),
    check(
      "fps",
      "30 cuadros por segundo",
      Math.abs(probe.fps - REEL.fps) < 0.01,
      "error",
      `${probe.fps} fps`,
    ),
    check(
      "codec",
      "H.264 + yuv420p (compatible con Instagram y TikTok)",
      probe.vcodec === "h264" && probe.pixfmt === "yuv420p",
      "error",
      `${probe.vcodec} ${probe.pixfmt}`,
    ),
    check(
      "audio",
      "Pista de audio AAC 48 kHz",
      probe.acodec === "aac" && probe.sampleRate === 48000,
      "error",
      `${probe.acodec ?? "sin audio"} ${probe.sampleRate ?? ""}`,
    ),
    check(
      "length",
      "La duración coincide con el guion",
      Math.abs(probe.duration - t.total) <= 0.35,
      "error",
      `${probe.duration.toFixed(2)} s vs ${t.total} s`,
    ),
    check(
      "size",
      "Pesa menos de 100 MB",
      probe.sizeBytes <= 100 * 1024 * 1024,
      "error",
      `${(probe.sizeBytes / 1048576).toFixed(1)} MB`,
    ),
    silent
      ? check(
          "loudness",
          "Volumen normalizado",
          false,
          "warning",
          "sin audio propio: elige la música al publicar en la app",
        )
      : check(
          "loudness",
          "Volumen normalizado (−16 a −12 LUFS)",
          probe.lufs! >= -16 && probe.lufs! <= -12,
          "warning",
          `${probe.lufs} LUFS`,
        ),
    check(
      "peak",
      "Sin saturación (pico ≤ −1 dBTP)",
      silent || (probe.truePeak ?? -99) <= -1,
      "warning",
      `${probe.truePeak} dBTP`,
    ),
    check(
      "black",
      "Sin pantallas negras",
      probe.black.length === 0,
      "error",
      probe.black.map((b) => `${b.start}–${b.end} s`).join(", "),
    ),
  ];
}

export function report(checks: QaCheck[]): QaReport {
  const errors = checks.filter((c) => !c.ok && c.severity === "error").length;
  const warnings = checks.filter((c) => !c.ok && c.severity === "warning").length;
  return { ok: errors === 0, score: Math.max(0, 100 - errors * 25 - warnings * 5), checks };
}

// ---------------------------------------------------------------------------
// Lectura de la salida de ffprobe/ffmpeg (puras, para poder probarlas)
// ---------------------------------------------------------------------------
export function parseRate(rate: string): number {
  const [n, d] = rate.split("/").map(Number);
  return d ? Math.round((n / d) * 1000) / 1000 : n;
}

/** Del filtro ebur128 (resumen final): "I: -14.2 LUFS" y "Peak: -1.6 dBFS". */
export function parseEbur128(stderr: string): { lufs: number | null; truePeak: number | null } {
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const i = summary.match(/I:\s+(-?[\d.]+|-inf)\s+LUFS/);
  const p = summary.match(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/);
  const num = (m: RegExpMatchArray | null) => (!m || m[1] === "-inf" ? null : Number(m[1]));
  return { lufs: num(i), truePeak: num(p) };
}

/** Del filtro blackdetect: "black_start:1.2 black_end:1.9". */
export function parseBlackdetect(stderr: string): { start: number; end: number }[] {
  return [...stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/g)].map((m) => ({
    start: Number(m[1]),
    end: Number(m[2]),
  }));
}

const short = (s: string) => (s.length > 32 ? `${s.slice(0, 31)}…` : s);
