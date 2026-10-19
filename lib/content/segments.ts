import type { EventType } from "@/lib/domain";

export type Segment = {
  slug: "bodas" | "corporativo" | "full-day";
  eventType: EventType;
  nav: string;
  title: string;
  lead: string;
  promise: string[];
  idealFor: string[];
  cta: string;
  capacityKey: "cocktail" | "banquet" | "full_day";
  /** Invitados sugeridos en el cotizador. */
  defaultGuests: number;
  artTone: "green" | "olive" | "camel" | "slate";
  /** Tipos de evento que se cotizan desde este segmento (el primero es el predeterminado). */
  quoteTypes: EventType[];
};

// Copy por segmento. Promesa (manual SAWA): belleza del lugar + facilidad operativa + libertad.
export const SEGMENTS: Segment[] = [
  {
    slug: "bodas",
    eventType: "wedding",
    nav: "Bodas",
    title: "Tu boda en el campo, a tu manera",
    lead: "Jardín, terraza y piscina en Pachacámac para una celebración íntima o grande. Tú y tu planner ponen la creatividad; nosotros hacemos que el espacio funcione.",
    promise: [
      "Exclusividad: un solo evento por día.",
      "Libertad para elegir tu catering, música y decoración.",
      "Un equipo que coordina la operación del local contigo y tu planner.",
    ],
    idealFor: [
      "Matrimonios civiles y religiosos",
      "Quinceañeros",
      "Aniversarios y pedidas de mano",
    ],
    cta: "Consultar fecha para mi boda",
    capacityKey: "cocktail",
    defaultGuests: 100,
    artTone: "olive",
    quoteTypes: ["wedding", "social"],
  },
  {
    slug: "corporativo",
    eventType: "corporate",
    nav: "Empresas",
    title: "Full days y team building fuera de la oficina",
    lead: "Un espacio privado al sur de Lima para que tu equipo se desconecte: jardín, piscina y zona de parrilla, con la logística resuelta.",
    promise: [
      "Fechas de lunes a jueves con tarifas especiales.",
      "Factura electrónica con IGV.",
      "Coordinación con tus proveedores o con aliados que te recomendamos.",
    ],
    idealFor: ["Team building y offsites", "Cierres de año", "Activaciones y lanzamientos"],
    cta: "Cotizar evento corporativo",
    capacityKey: "banquet",
    defaultGuests: 40,
    artTone: "slate",
    quoteTypes: ["corporate"],
  },
  {
    slug: "full-day",
    eventType: "family_day",
    nav: "Full day",
    title: "Un día de piscina y campo para tu familia o grupo",
    lead: "Alquila la casa completa para ustedes: piscina, jardín y parrilla, sin compartir con otros grupos.",
    promise: [
      "Casa completa y exclusiva por el día.",
      "Ideal para cumpleaños y reuniones grandes.",
      "Pernocte opcional.",
    ],
    idealFor: ["Cumpleaños", "Reuniones familiares", "Grupos de amigos"],
    cta: "Ver disponibilidad",
    capacityKey: "full_day",
    defaultGuests: 30,
    artTone: "camel",
    quoteTypes: ["family_day"],
  },
];

export const FAQ = [
  {
    q: "¿Cómo separo una fecha?",
    a: "Consulta disponibilidad, te enviamos la cotización y separas la fecha con el adelanto. El saldo se paga antes del evento y firmamos un contrato.",
  },
  {
    q: "¿Puedo traer mis propios proveedores?",
    a: "Sí. Puedes contratar tu catering, música y decoración, siempre que cumplan las normas de seguridad y cuidado del local.",
  },
  {
    q: "¿Hay garantía?",
    a: "Sí, una garantía reembolsable que se devuelve después del evento si no hay daños.",
  },
  {
    q: "¿Trabajan con wedding planners?",
    a: "Sí. Tenemos un programa para planners aliadas con reglas transparentes. Si tienes planner, ella puede gestionar tu reserva con nosotros.",
  },
  {
    q: "¿Emiten factura?",
    a: "Sí, emitimos comprobante electrónico con IGV.",
  },
];
