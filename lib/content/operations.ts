// Plantillas de operación por defecto (editables en settings: checklist_templates, standard_event_costs).
export const CHECKLIST_LABEL = {
  d7: "Checklist D-7",
  d1: "Checklist D-1",
  handover: "Acta de entrega del local",
  return: "Acta de recepción del local",
} as const;
export type ChecklistKind = keyof typeof CHECKLIST_LABEL;

export const DEFAULT_CHECKLISTS: Record<ChecklistKind, string[]> = {
  d7: [
    "Saldo pagado y validado",
    "Contrato firmado registrado",
    "Garantía recibida",
    "Lista de proveedores del cliente recibida",
    "Horario de montaje y desmontaje confirmado",
    "Mantenimiento de piscina programado",
  ],
  d1: [
    "Limpieza general del local",
    "Piscina tratada (cloro y pH registrados)",
    "Baños abastecidos",
    "Energía y grupo electrógeno revisados",
    "Personal de apoyo y seguridad confirmado",
    "Extintores y señalización en su lugar",
  ],
  handover: [
    "Recorrido con el cliente o su planner",
    "Estado de mobiliario y jardín registrado con fotos",
    "Reglamento de uso entregado",
    "Contacto de emergencia del encargado en sitio",
  ],
  return: [
    "Recorrido de recepción con fotos",
    "Inventario de mobiliario completo",
    "Daños registrados como incidencia (si los hay)",
    "Llaves y accesos devueltos",
  ],
};

export const COST_LABEL = {
  cleaning: "Limpieza",
  staff: "Personal de apoyo",
  security: "Seguridad",
  energy: "Energía",
  water: "Agua",
  pool: "Mantenimiento de piscina",
  supplies: "Reposiciones",
  other: "Otros",
} as const;
export type CostCategory = keyof typeof COST_LABEL;
