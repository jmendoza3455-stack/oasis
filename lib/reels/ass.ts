import { REEL, timeline, type Overlay, type OverlayStyle, type ReelSpec } from "./spec";

// Subtítulos ASS (libass) con la marca Oasis. Los márgenes dejan libres las zonas que tapa la
// interfaz de Instagram/TikTok: ~220 px arriba, ~480 px abajo y ~140 px a la derecha.
export const SAFE = { top: 220, bottom: 480, left: 90, right: 150 } as const;

// Colores ASS: &HAABBGGRR (AA = transparencia; 00 opaco)
const C = {
  green: "2B3B2E",
  ivory: "F0F5F7",
  sand: "CBDCE6",
  camel: "6CA4C9",
  ink: "18242A",
} as const;
const col = (bgr: string, alpha = "00") => `&H${alpha}${bgr}`;

type StyleDef = {
  font: string;
  size: number;
  primary: string;
  back: string;
  box: boolean;
  pad: number;
  align: number;
  marginV: number;
  spacing: number;
};

export const STYLES: Record<OverlayStyle | "endTitle" | "endLine" | "endSub", StyleDef> = {
  kicker: {
    font: "Figtree ExtraBold",
    size: 40,
    primary: col(C.camel),
    back: col(C.green, "FF"),
    box: false,
    pad: 0,
    align: 8,
    marginV: SAFE.top + 40,
    spacing: 6,
  },
  hook: {
    font: "Cormorant Garamond SemiBold",
    size: 112,
    primary: col(C.ivory),
    back: col(C.green, "38"),
    box: true,
    pad: 22,
    align: 8,
    marginV: SAFE.top + 120,
    spacing: 0,
  },
  caption: {
    font: "Figtree SemiBold",
    size: 60,
    primary: col(C.ivory),
    back: col(C.green, "38"),
    box: true,
    pad: 16,
    align: 2,
    marginV: SAFE.bottom + 60,
    spacing: 0,
  },
  cta: {
    font: "Figtree ExtraBold",
    size: 64,
    primary: col(C.ink),
    back: col(C.camel),
    box: true,
    pad: 20,
    align: 2,
    marginV: SAFE.bottom + 160,
    spacing: 0,
  },
  endTitle: {
    font: "Cormorant Garamond SemiBold",
    size: 108,
    primary: col(C.ivory),
    back: col(C.green, "FF"),
    box: false,
    pad: 0,
    align: 5,
    marginV: 0,
    spacing: 0,
  },
  endLine: {
    font: "Figtree SemiBold",
    size: 56,
    primary: col(C.sand),
    back: col(C.green, "FF"),
    box: false,
    pad: 0,
    align: 5,
    marginV: 0,
    spacing: 0,
  },
  endSub: {
    font: "Figtree ExtraBold",
    size: 42,
    primary: col(C.camel),
    back: col(C.green, "FF"),
    box: false,
    pad: 0,
    align: 5,
    marginV: 0,
    spacing: 4,
  },
};

/** "H:MM:SS.cc" */
export function assTime(seconds: number): string {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

/** Texto seguro para ASS: sin llaves ni barras invertidas; saltos de línea manuales con "\N". */
export function assText(text: string, style: OverlayStyle | "endTitle" | "endLine" | "endSub") {
  const clean = text.replace(/[{}\\]/g, "").replace(/\s*\n\s*/g, "\\N");
  return style === "kicker" || style === "endSub" ? clean.toLocaleUpperCase("es-PE") : clean;
}

function styleLine(name: string, s: StyleDef) {
  // Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,
  // Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,
  // Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
  const border = s.box ? 3 : 1;
  const outline = s.box ? s.pad : 0;
  const outlineColour = s.box ? s.back : col(C.green, "FF");
  const shadow = s.box ? 0 : 2;
  return `Style: ${name},${s.font},${s.size},${s.primary},${s.primary},${outlineColour},${s.box ? s.back : col("000000", "90")},0,0,0,0,100,100,${s.spacing},0,${border},${outline},${shadow},${s.align},${SAFE.left},${SAFE.right},${s.marginV},1`;
}

function dialogue(start: number, end: number, style: string, text: string, tags = "") {
  return `Dialogue: 0,${assTime(start)},${assTime(end)},${style},,0,0,0,,${tags}${text}`;
}

export function buildAss(spec: ReelSpec): string {
  const t = timeline(spec);
  const events: string[] = spec.overlays.map((o: Overlay) =>
    dialogue(
      o.start,
      Math.min(o.end, t.main),
      o.style,
      assText(o.text, o.style),
      "{\\fad(150,150)}",
    ),
  );
  if (spec.endCard) {
    const s = t.endCardStart;
    const e = t.total;
    const cx = REEL.width / 2;
    events.push(
      dialogue(s, e, "endTitle", "Oasis Pachacámac", `{\\an5\\pos(${cx},1030)\\fad(200,0)}`),
      dialogue(s, e, "endSub", "Pachacámac · Lima", `{\\an5\\pos(${cx},1120)\\fad(200,0)}`),
      dialogue(
        s + 0.3,
        e,
        "endLine",
        assText(spec.endCard.line1, "endLine"),
        `{\\an5\\pos(${cx},1300)\\fad(200,0)}`,
      ),
    );
    if (spec.endCard.line2)
      events.push(
        dialogue(
          s + 0.3,
          e,
          "endLine",
          assText(spec.endCard.line2, "endLine"),
          `{\\an5\\pos(${cx},1390)\\fad(200,0)}`,
        ),
      );
  }
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${REEL.width}`,
    `PlayResY: ${REEL.height}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    ...Object.entries(STYLES).map(([name, s]) => styleLine(name, s)),
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}
