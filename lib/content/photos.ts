// Registro de fotos REALES del local (archivos en public/photos/). Vacío hasta la sesión de fotos:
// mientras tanto la web usa arte de marca, nunca fotos de stock presentadas como el local (regla 10).
export type Photo = { src: string; alt: string };

export const PHOTOS: {
  hero: Photo | null;
  segments: Record<"bodas" | "corporativo" | "full-day", Photo | null>;
  spaces: Photo[];
} = {
  hero: null,
  segments: { bodas: null, corporativo: null, "full-day": null },
  spaces: [],
};
