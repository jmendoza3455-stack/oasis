import { z } from "zod";

// Piezas gráficas del agente diseñador: carruseles (4:5), historias (9:16) y publicaciones de
// Google Business (4:3), con plantillas de la marca. scripts/design-render.mts las convierte en PNG.

export const FORMATS = {
  carousel: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  gbp: { width: 1200, height: 900 },
} as const;
export type Format = keyof typeof FORMATS;

/** Límites de texto por diseño (lo que entra legible en un celular). */
export const LIMITS = {
  title: { cover: 60, text: 50, list: 50, fact: 40, cta: 40 },
  body: 220,
  item: 70,
  items: 5,
} as const;

const slideSchema = z.discriminatedUnion("layout", [
  z.object({
    layout: z.literal("cover"),
    kicker: z.string().max(40).optional(),
    title: z.string().min(1),
    subtitle: z.string().max(120).optional(),
    /** Foto de fondo (ruta local de un clip o foto real del local; nunca de otro lugar). */
    image: z.string().optional(),
  }),
  z.object({ layout: z.literal("text"), title: z.string().min(1), body: z.string().min(1) }),
  z.object({
    layout: z.literal("list"),
    title: z.string().min(1),
    items: z.array(z.string().min(1)).min(2),
    numbered: z.boolean().default(false),
  }),
  z.object({
    layout: z.literal("fact"),
    title: z.string().min(1),
    body: z.string().optional(),
    /** Toda cifra o dato lleva su fuente (CLAUDE.md regla 10). */
    source: z.string().min(3).max(140),
  }),
  z.object({
    layout: z.literal("cta"),
    title: z.string().min(1),
    subtitle: z.string().max(120).optional(),
  }),
]);

export const designSpecSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,60}$/),
  format: z.enum(["carousel", "story", "gbp"]),
  slides: z.array(slideSchema).min(1).max(10),
});

export type DesignSpecInput = z.input<typeof designSpecSchema>;
export type DesignSpec = z.output<typeof designSpecSchema>;
export type Slide = DesignSpec["slides"][number];
