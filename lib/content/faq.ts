import type { Segment } from "./segments";

// Preguntas frecuentes por segmento. Las cifras salen de settings (VenueInfo); si un dato no está
// configurado, la respuesta no inventa un número.
export type FaqInfo = {
  capacity: { cocktail: number | null; banquet: number | null; full_day: number | null };
  depositPct: number | null;
  holdHours: number | null;
  balanceDueDays: number | null;
};

type Item = { q: string; a: string };

const pct = (v: number | null) => (v === null ? null : `${Math.round(v * 100)} %`);

export function separateFaq(info: FaqInfo): Item {
  const deposit = pct(info.depositPct);
  return {
    q: "¿Cómo separo una fecha?",
    a: [
      "Consulta disponibilidad aquí y te enviamos la cotización.",
      info.holdHours
        ? `Podemos guardarte la fecha ${info.holdHours} horas sin costo mientras decides.`
        : null,
      deposit
        ? `La fecha queda separada con el adelanto del ${deposit}`
        : "La fecha queda separada con el adelanto",
      info.balanceDueDays
        ? `y el saldo se paga hasta ${info.balanceDueDays} días antes del evento. Firmamos un contrato.`
        : "y el saldo se paga antes del evento. Firmamos un contrato.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function segmentFaq(segment: Segment, info: FaqInfo): Item[] {
  const cap = info.capacity;
  const capLine =
    segment.slug === "full-day"
      ? cap.full_day
        ? `Hasta ${cap.full_day} personas para un full day.`
        : null
      : cap.cocktail || cap.banquet
        ? [
            cap.cocktail && `hasta ${cap.cocktail} invitados en formato cóctel`,
            cap.banquet && `${cap.banquet} en banquete`,
          ]
            .filter(Boolean)
            .join(" y ")
            .replace(/^./, (c) => c.toUpperCase()) + "."
        : null;
  const common: Item[] = [
    ...(capLine
      ? [
          {
            q: "¿Cuántas personas entran?",
            a: `${capLine} Te asesoramos según el montaje que imaginas.`,
          },
        ]
      : []),
    separateFaq(info),
    {
      q: "¿El local es solo para nosotros?",
      a: "Sí. Hacemos un solo evento por día: el espacio es exclusivo para tu grupo.",
    },
  ];
  const specific: Record<Segment["slug"], Item[]> = {
    bodas: [
      {
        q: "¿Puedo traer mi catering, mi música y mi planner?",
        a: "Sí. Tú eliges a tus proveedores, siempre que cumplan las normas de seguridad y cuidado del local. Si trabajas con una wedding planner, ella puede gestionar la reserva con nosotros.",
      },
      {
        q: "¿Hay garantía?",
        a: "Sí, una garantía reembolsable que se devuelve después del evento si no hay daños.",
      },
    ],
    corporativo: [
      {
        q: "¿Emiten factura?",
        a: "Sí. Emitimos comprobante electrónico con IGV a nombre de tu empresa.",
      },
      {
        q: "¿Atienden de lunes a jueves?",
        a: "Sí, y entre semana tenemos tarifas especiales para empresas. Consulta tu fecha en el cotizador.",
      },
    ],
    "full-day": [
      {
        q: "¿Podemos quedarnos a dormir?",
        a: "El pernocte es opcional y se coordina al cotizar.",
      },
      {
        q: "¿Hay garantía?",
        a: "Sí, una garantía reembolsable que se devuelve después del evento si no hay daños.",
      },
    ],
  };
  return [...common, ...specific[segment.slug]];
}
