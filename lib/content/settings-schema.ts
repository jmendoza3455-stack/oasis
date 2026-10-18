// Catálogo de parámetros editables (OASIS.md §3). Cada uno se valida antes de guardarse.
export type SettingDef = {
  key: string;
  label: string;
  group: "Reservas" | "Dinero" | "Planners" | "Comercial" | "Metas";
  type: "number" | "percent" | "text" | "json" | "date";
  help?: string;
};

export const SETTINGS: SettingDef[] = [
  { key: "reopening_date", label: "Fecha de reapertura", group: "Reservas", type: "date" },
  {
    key: "booking_mode",
    label: "Modo de reserva",
    group: "Reservas",
    type: "text",
    help: "one_per_day o slots",
  },
  {
    key: "slot_hours",
    label: "Franjas horarias",
    group: "Reservas",
    type: "json",
    help: '{"full_day": ["09:00","18:00"], "night": ["19:00","03:00"]}',
  },
  {
    key: "capacity",
    label: "Aforo",
    group: "Reservas",
    type: "json",
    help: '{"cocktail": 150, "banquet": 100, "full_day": 60}',
  },
  { key: "hold_hours", label: "Horas de pre-reserva", group: "Reservas", type: "number" },
  {
    key: "high_season_months",
    label: "Meses de temporada alta",
    group: "Reservas",
    type: "json",
    help: "[12, 1, 2, 3]",
  },
  { key: "igv_rate", label: "IGV", group: "Dinero", type: "percent" },
  { key: "deposit_pct", label: "Adelanto", group: "Dinero", type: "percent" },
  {
    key: "balance_due_days",
    label: "Días antes del evento para el saldo",
    group: "Dinero",
    type: "number",
  },
  {
    key: "guarantee_amounts",
    label: "Garantía por tipo de evento (S/)",
    group: "Dinero",
    type: "json",
  },
  {
    key: "discount_cap_pct",
    label: "Tope de descuento sin aprobación (%)",
    group: "Dinero",
    type: "number",
  },
  { key: "cancellation_policy", label: "Política de cancelación", group: "Dinero", type: "json" },
  {
    key: "currency_usd_rate",
    label: "Tipo de cambio referencial (S/ por US$)",
    group: "Dinero",
    type: "number",
  },
  {
    key: "planner_commission_rate",
    label: "Comisión del planner",
    group: "Planners",
    type: "percent",
  },
  {
    key: "commission_payment_days",
    label: "Días para pagar la comisión",
    group: "Planners",
    type: "number",
  },
  {
    key: "planner_max_active_holds",
    label: "Pre-reservas activas por planner",
    group: "Planners",
    type: "number",
  },
  {
    key: "planner_protection_days",
    label: "Días de protección del lead",
    group: "Planners",
    type: "number",
  },
  {
    key: "planner_agreement_version",
    label: "Versión vigente del contrato marco",
    group: "Planners",
    type: "text",
  },
  { key: "monthly_ad_budget", label: "Pauta mensual (S/)", group: "Comercial", type: "number" },
  {
    key: "first_response_sla_minutes",
    label: "SLA de primera respuesta (min)",
    group: "Comercial",
    type: "number",
  },
  { key: "business_hours", label: "Horario comercial", group: "Comercial", type: "json" },
  {
    key: "standard_event_costs",
    label: "Costos directos estándar por evento (S/)",
    group: "Dinero",
    type: "json",
    help: '{"cleaning": 250, "staff": 400, "security": 200}',
  },
  {
    key: "checklist_templates",
    label: "Plantillas de checklist",
    group: "Reservas",
    type: "json",
    help: '{"d7": ["..."], "d1": ["..."]}',
  },
  { key: "occupancy_targets", label: "Metas de ocupación", group: "Metas", type: "json" },
];
