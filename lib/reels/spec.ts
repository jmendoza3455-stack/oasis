import { z } from "zod";

// Especificación de un Reel (lo que escribe el agente editor): clips con sus cortes, textos en
// pantalla con estilos de la marca y cierre con logo. El motor (scripts/reels-render.mts) la
// convierte en un MP4 vertical 1080×1920 listo para publicar.

export const REEL = { width: 1080, height: 1920, fps: 30, endCardSeconds: 2.5 } as const;

export const OVERLAY_STYLES = ["kicker", "hook", "caption", "cta"] as const;
export type OverlayStyle = (typeof OVERLAY_STYLES)[number];

const seconds = z.number().finite().min(0).max(600);

export const clipSchema = z
  .object({
    /** Ruta local o clave del bucket "marketing" (marketing/clips/…). */
    src: z.string().min(1).max(300),
    in: seconds,
    out: seconds,
    /** Encuadre al recortar a vertical: qué parte del cuadro se conserva. */
    crop: z.enum(["center", "left", "right", "top", "bottom"]).default("center"),
    speed: z.number().min(0.5).max(2).default(1),
    /** Movimiento de cámara simulado para tomas fijas (zoom lento de 6 %). */
    motion: z.enum(["none", "zoom-in", "zoom-out"]).default("none"),
    mute: z.boolean().default(false),
  })
  .refine((c) => c.out - c.in >= 0.5, { message: "Cada corte debe durar al menos 0.5 s." });

export const overlaySchema = z
  .object({
    text: z.string().trim().min(1).max(110),
    start: seconds,
    end: seconds,
    style: z.enum(OVERLAY_STYLES),
  })
  .refine((o) => o.end > o.start, { message: "Un texto debe terminar después de empezar." });

export const reelSpecSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,60}$/, "id en minúsculas con guiones, p. ej. r01-obra"),
  title: z.string().trim().min(3).max(120),
  clips: z.array(clipSchema).min(1).max(24),
  overlays: z.array(overlaySchema).max(24).default([]),
  endCard: z
    .object({
      line1: z.string().trim().min(1).max(60),
      line2: z.string().trim().max(60).optional(),
    })
    .nullable()
    .default({ line1: "Mira las fechas libres", line2: "Link en la bio" }),
  /** Segundo del video que se usa como portada (debe mostrar el gancho). */
  coverAt: z.number().min(0).max(60).default(1),
});

export type ReelSpecInput = z.input<typeof reelSpecSchema>;
export type ReelSpec = z.output<typeof reelSpecSchema>;
export type Clip = z.output<typeof clipSchema>;
export type Overlay = z.output<typeof overlaySchema>;

/** Duración en pantalla de un corte (considera la velocidad). */
export const clipDuration = (c: Clip) => (c.out - c.in) / c.speed;

/** Duración total: cortes + cierre. */
export function timeline(spec: ReelSpec) {
  const main = spec.clips.reduce((sum, c) => sum + clipDuration(c), 0);
  const end = spec.endCard ? REEL.endCardSeconds : 0;
  return { main: round3(main), endCardStart: round3(main), total: round3(main + end) };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
