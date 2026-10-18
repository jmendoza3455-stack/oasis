// Contrato marco del programa de planners: RESUMEN de las reglas que se aceptan en el portal.
// El texto legal completo (docs/) es un borrador para revisión de abogado (OASIS.md §11.4).
export const AGREEMENT_TITLE = "Contrato marco del programa de planners aliadas";

export function agreementClauses(p: {
  commissionPct: number;
  holdHours: number;
  maxHolds: number;
  protectionDays: number;
  paymentDays: number;
}) {
  return [
    `Comisión: ${p.commissionPct} % sobre el alquiler del espacio sin IGV. No incluye garantía ni servicios de terceros.`,
    `La comisión se gana cuando el evento se realiza y está cobrado al 100 %, y se paga ${p.paymentDays} días después.`,
    `Pre-reservas: cada una dura ${p.holdHours} horas y vence sola. Puedes tener hasta ${p.maxHolds} activas a la vez.`,
    `Protección de clientes: si un cliente que registraste nos contacta directo dentro de ${p.protectionDays} días, la reserva se te atribuye.`,
    "Registras datos reales y con autorización de tu cliente (Ley N.º 29733); solo ves la información de tus propios clientes.",
    "El cliente firma el contrato de alquiler con SAWA – Gestión Comercial S.A.C. y paga directamente a SAWA.",
    "Cumples el reglamento de uso del local y los estándares de seguridad para proveedores.",
    "SAWA puede actualizar el programa con aviso previo; las nuevas versiones requieren tu aceptación en el portal.",
  ];
}
