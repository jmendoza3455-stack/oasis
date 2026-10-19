import type { Segment } from "./segments";

// Catálogo de EJEMPLO para la vista previa de la marca madre (F3). No son paquetes reales: los
// componentes, proveedores y precios se definen con André y Carlos (S58). Todo lo que se muestra
// lleva la etiqueta "Ejemplo" (regla 10).

export type Experience = {
  slug: string;
  name: string;
  segment: Segment["slug"];
  summary: string;
  includes: { label: string; by: "local" | "aliado" }[];
  idealFor: string[];
  venues: string[];
  photo: string;
  example: true;
};

export const EXPERIENCES: Experience[] = [
  {
    slug: "boda-campestre-de-dia",
    name: "Boda campestre de día",
    segment: "bodas",
    summary:
      "Ceremonia y celebración en el jardín, con la casa solo para ustedes y los proveedores coordinados en un solo lugar.",
    includes: [
      { label: "Local exclusivo por el día", by: "local" },
      { label: "Coordinación del día con tu planner", by: "local" },
      { label: "Ambientación base del jardín", by: "aliado" },
      { label: "Catering y bar", by: "aliado" },
      { label: "Música y sonido", by: "aliado" },
    ],
    idealFor: ["Matrimonios civiles y religiosos", "Renovación de votos"],
    venues: ["oasis-pachacamac"],
    photo: "/placeholders/jardin.svg",
    example: true,
  },
  {
    slug: "full-day-de-integracion",
    name: "Full day de integración",
    segment: "corporativo",
    summary:
      "Un día fuera de la oficina con almuerzo, actividades para el equipo y la factura resuelta.",
    includes: [
      { label: "Local exclusivo de lunes a jueves", by: "local" },
      { label: "Almuerzo de parrilla", by: "aliado" },
      { label: "Actividades de integración con facilitador", by: "aliado" },
      { label: "Movilidad desde Lima (opcional)", by: "aliado" },
    ],
    idealFor: ["Team building", "Cierres de año", "Planificación anual"],
    venues: ["oasis-pachacamac"],
    photo: "/placeholders/parrilla.svg",
    example: true,
  },
  {
    slug: "cumpleanos-con-piscina",
    name: "Cumpleaños con piscina",
    segment: "full-day",
    summary:
      "Piscina, parrilla y jardín para tu grupo, con la decoración y la comida listas al llegar.",
    includes: [
      { label: "Casa completa por el día", by: "local" },
      { label: "Parrilla y bebidas", by: "aliado" },
      { label: "Decoración temática", by: "aliado" },
      { label: "Torta y bocaditos", by: "aliado" },
    ],
    idealFor: ["Cumpleaños", "Reuniones familiares", "Grupos de amigos"],
    venues: ["oasis-pachacamac"],
    photo: "/placeholders/piscina.svg",
    example: true,
  },
];

export const experience = (slug: string) => EXPERIENCES.find((e) => e.slug === slug) ?? null;
