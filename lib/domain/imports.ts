import { parseAmount, parseFlexibleDate } from "./csv";
import type { EventType } from "./pricing";

// ---------------------------------------------------------------------------
// Inversión de campañas desde exportes de Meta Ads y Google Ads (español o inglés)
// ---------------------------------------------------------------------------
const CAMPAIGN_KEYS = ["campaign_name", "nombre_de_la_campana", "campana", "campaign"];
const SPEND_KEYS = [
  "amount_spent_pen",
  "importe_gastado_pen",
  "amount_spent",
  "importe_gastado",
  "cost",
  "costo",
  "coste",
  "spend",
  "inversion",
];
const DATE_KEYS = [
  "reporting_starts",
  "inicio_del_informe",
  "day",
  "dia",
  "date",
  "fecha",
  "month",
  "mes",
];
const IMPRESSION_KEYS = ["impressions", "impresiones", "impr"];
const CLICK_KEYS = ["clicks", "clics", "link_clicks", "clics_en_el_enlace"];

const pick = (r: Record<string, string>, keys: string[]) =>
  keys.map((k) => r[k]).find((v) => v !== undefined && v !== "");

export type SpendRow = {
  campaign: string;
  month: string;
  amount: number;
  impressions: number;
  clicks: number;
};

export function aggregateCampaignSpend(records: Record<string, string>[]): {
  rows: SpendRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const map = new Map<string, SpendRow>();
  records.forEach((r, i) => {
    const campaign = pick(r, CAMPAIGN_KEYS);
    const amount = parseAmount(pick(r, SPEND_KEYS) ?? "");
    const rawDate = pick(r, DATE_KEYS) ?? "";
    const date =
      parseFlexibleDate(rawDate) ?? (/^\d{4}-\d{2}$/.test(rawDate) ? `${rawDate}-01` : null);
    if (!campaign || amount === null || !date) {
      errors.push(`Fila ${i + 2}: falta campaña, monto o fecha.`);
      return;
    }
    const month = `${date.slice(0, 7)}-01`;
    const key = `${campaign}|${month}`;
    const prev = map.get(key) ?? { campaign, month, amount: 0, impressions: 0, clicks: 0 };
    prev.amount = Math.round((prev.amount + amount) * 100) / 100;
    prev.impressions += Number(parseAmount(pick(r, IMPRESSION_KEYS) ?? "") ?? 0);
    prev.clicks += Number(parseAmount(pick(r, CLICK_KEYS) ?? "") ?? 0);
    map.set(key, prev);
  });
  return { rows: [...map.values()], errors };
}

// ---------------------------------------------------------------------------
// Eventos históricos ya realizados
// ---------------------------------------------------------------------------
export const HISTORICAL_TEMPLATE =
  "fecha,tipo,invitados,canal,monto_sin_igv,cliente,telefono,correo\n15/02/2026,boda,120,directo,4500,Ejemplo Pérez,999888777,ejemplo@correo.pe\n";

const TYPE: Record<string, EventType> = {
  boda: "wedding",
  matrimonio: "wedding",
  wedding: "wedding",
  social: "social",
  quinceanero: "social",
  cumpleanos: "social",
  corporativo: "corporate",
  empresa: "corporate",
  corporate: "corporate",
  full_day: "family_day",
  fullday: "family_day",
  familiar: "family_day",
  family_day: "family_day",
};
const CHANNEL: Record<string, "planner" | "direct" | "referral" | "organic"> = {
  planner: "planner",
  directo: "direct",
  direct: "direct",
  referido: "referral",
  referral: "referral",
  organico: "organic",
  organic: "organic",
};

export type HistoricalEvent = {
  line: number;
  date: string;
  eventType: EventType;
  guests: number;
  channel: "planner" | "direct" | "referral" | "organic";
  listNet: number;
  clientName: string;
  phone: string | null;
  email: string | null;
};

const norm = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");

export function parseHistoricalEvents(records: Record<string, string>[], today: string) {
  const ok: HistoricalEvent[] = [];
  const errors: string[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const date = parseFlexibleDate(r.fecha ?? "");
    const eventType = TYPE[norm(r.tipo ?? "")];
    const guests = Number.parseInt(r.invitados ?? "", 10);
    const channel = CHANNEL[norm(r.canal ?? "directo")] ?? "direct";
    const listNet = parseAmount(r.monto_sin_igv ?? "");
    const problems = [
      !date && "fecha inválida",
      date && date >= today && "la fecha debe ser pasada",
      !eventType && "tipo desconocido",
      !(guests > 0) && "invitados inválido",
      (listNet === null || listNet < 0) && "monto inválido",
      !r.cliente?.trim() && "falta cliente",
      channel === "planner" && "los eventos con planner se registran a mano (requieren el planner)",
    ].filter(Boolean);
    if (problems.length) {
      errors.push(`Fila ${line}: ${problems.join(", ")}.`);
      return;
    }
    ok.push({
      line,
      date: date!,
      eventType: eventType!,
      guests,
      channel,
      listNet: listNet!,
      clientName: r.cliente.trim(),
      phone: r.telefono?.trim() || null,
      email: r.correo?.trim() || null,
    });
  });
  return { ok, errors };
}
