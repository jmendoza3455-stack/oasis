// Plantillas de correo y WhatsApp (texto), versionadas en el repo (OASIS.md §6.5).
// Cambiar un texto = subir `version`; el outbox guarda la versión usada en cada envío.
// Los datos sin definir van como [COMPLETAR …] (CLAUDE.md regla 9).

export type BookingCtx = {
  venueName: string;
  recipientName: string;
  eventLabel: string; // "Boda del 20/02/2027"
  eventDate: string; // dd/mm/aaaa
  balance: string; // "S/ 2,655.00"
  balanceDueOn: string | null;
  guests: number;
};

export type DigestCtx = {
  venueName: string;
  date: string;
  items: { title: string; lines: string[] }[];
  adminUrl: string;
};

const PAYMENT_INFO =
  "Datos de pago: [COMPLETAR cuenta bancaria de SAWA – Gestión Comercial S.A.C. y número de Yape/Plin]. " +
  "Envía tu voucher por este medio para validarlo.";
const ONSITE_CONTACT = "[COMPLETAR nombre y celular de la persona encargada en el local]";

type Template<C> = {
  version: string;
  subject: (c: C) => string;
  email: (c: C) => string;
  whatsapp?: (c: C) => string;
};

type BookingTemplate = Template<BookingCtx> & { whatsapp: (c: BookingCtx) => string };
const bk = (t: BookingTemplate) => t;
const dg = (t: Template<DigestCtx>) => t;

const sign = (c: { venueName: string }) => `\n\nEquipo ${c.venueName} · Un espacio SAWA`;

export const TEMPLATES = {
  balance_due_soon: bk({
    version: "2026-10-18.1",
    subject: (c) => `Recordatorio de saldo · ${c.eventLabel}`,
    email: (c) =>
      `Hola ${c.recipientName}:\n\nTe recordamos que el saldo de ${c.balance} de tu ${c.eventLabel} vence el ${c.balanceDueOn}.\n\n${PAYMENT_INFO}${sign(c)}`,
    whatsapp: (c) =>
      `Hola ${c.recipientName}, te saluda ${c.venueName}. El saldo de ${c.balance} de tu ${c.eventLabel} vence el ${c.balanceDueOn}. ${PAYMENT_INFO}`,
  }),
  balance_due_today: bk({
    version: "2026-10-18.1",
    subject: (c) => `Hoy vence tu saldo · ${c.eventLabel}`,
    email: (c) =>
      `Hola ${c.recipientName}:\n\nHoy vence el saldo de ${c.balance} de tu ${c.eventLabel}. Si ya pagaste, envíanos el voucher y lo validamos.\n\n${PAYMENT_INFO}${sign(c)}`,
    whatsapp: (c) =>
      `Hola ${c.recipientName}, hoy vence el saldo de ${c.balance} de tu ${c.eventLabel}. Si ya pagaste, envíanos el voucher por aquí. ${PAYMENT_INFO}`,
  }),
  balance_overdue: bk({
    version: "2026-10-18.1",
    subject: (c) => `Saldo pendiente · ${c.eventLabel}`,
    email: (c) =>
      `Hola ${c.recipientName}:\n\nEl saldo de ${c.balance} de tu ${c.eventLabel} venció el ${c.balanceDueOn}. Para confirmar tu fecha necesitamos el pago completo; escríbenos si necesitas coordinar.\n\n${PAYMENT_INFO}${sign(c)}`,
    whatsapp: (c) =>
      `Hola ${c.recipientName}, el saldo de ${c.balance} de tu ${c.eventLabel} venció el ${c.balanceDueOn}. Para confirmar tu fecha necesitamos el pago completo. ¿Coordinamos?`,
  }),
  event_d7: bk({
    version: "2026-10-18.1",
    subject: (c) => `Falta una semana · ${c.eventLabel}`,
    email: (c) =>
      `Hola ${c.recipientName}:\n\nFalta una semana para tu ${c.eventLabel} (${c.guests} invitados). Esta semana coordinamos horario de ingreso de proveedores, lista final de invitados y el acta de entrega del local.\n\nContacto en el local: ${ONSITE_CONTACT}.${sign(c)}`,
    whatsapp: (c) =>
      `Hola ${c.recipientName}, falta una semana para tu ${c.eventLabel}. ¿Coordinamos horario de ingreso de proveedores y lista final de invitados? Contacto en el local: ${ONSITE_CONTACT}.`,
  }),
  event_d1: bk({
    version: "2026-10-18.1",
    subject: (c) => `Mañana es tu evento · ${c.eventLabel}`,
    email: (c) =>
      `Hola ${c.recipientName}:\n\n¡Todo listo para tu ${c.eventLabel}! Al llegar firmamos juntos el acta de entrega del local. Recuerda la garantía y los horarios acordados.\n\nContacto en el local: ${ONSITE_CONTACT}.${sign(c)}`,
    whatsapp: (c) =>
      `Hola ${c.recipientName}, ¡todo listo para tu ${c.eventLabel}! Al llegar firmamos el acta de entrega. Contacto en el local: ${ONSITE_CONTACT}.`,
  }),
  ops_daily: dg({
    version: "2026-10-18.1",
    subject: (c) => `Operación del día ${c.date} · ${c.venueName}`,
    email: (c) => digest(c, "Pendientes de operación para hoy"),
  }),
  lead_sla: dg({
    version: "2026-10-18.1",
    subject: (c) => `Leads sin respuesta · ${c.venueName}`,
    email: (c) => digest(c, "Hay leads que superaron el tiempo de primera respuesta"),
  }),
  weekly_summary: dg({
    version: "2026-10-18.1",
    subject: (c) => `Resumen semanal ${c.date} · ${c.venueName}`,
    email: (c) => digest(c, "Resumen semanal para socios"),
  }),
};

export type TemplateId = keyof typeof TEMPLATES;
export type BookingTemplateId =
  "balance_due_soon" | "balance_due_today" | "balance_overdue" | "event_d7" | "event_d1";

function digest(c: DigestCtx, intro: string) {
  const body = c.items
    .map(
      (i) =>
        `${i.title}\n${i.lines.length ? i.lines.map((l) => `  • ${l}`).join("\n") : "  • Sin novedades"}`,
    )
    .join("\n\n");
  return `${intro} (${c.date}).\n\n${body}\n\nBack-office: ${c.adminUrl}`;
}

/** Enlace de WhatsApp con el texto prellenado (envío manual desde el back-office). */
export function whatsappLink(phone: string | null, text: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const intl = digits.length === 9 ? `51${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
