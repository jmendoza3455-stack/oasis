import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { withDb } from "@/lib/db";
import { fromNet, type EventType } from "@/lib/domain";

// Datos públicos del local para la web (aforo, políticas, precios "desde", contacto), leídos de
// settings y rate_cards con caché (se invalida al guardar en Configuración: tag public-settings).
// Si la BD no está disponible (p. ej. build sin BD), usa valores neutros sin cifras inventadas.

export type VenueInfo = {
  capacity: { cocktail: number | null; banquet: number | null; full_day: number | null };
  reopeningDate: string | null;
  /** La reapertura aún no ocurre (calculado dentro de la caché). */
  reopeningUpcoming: boolean;
  depositPct: number | null;
  balanceDueDays: number | null;
  holdHours: number | null;
  guaranteeAmounts: Partial<Record<EventType, number>>;
  plannerMaxHolds: number | null;
  plannerProtectionDays: number | null;
  plannerCommissionRate: number | null;
  commissionPaymentDays: number | null;
  slotHours: Record<string, [string, string]>;
  pricesEnabled: boolean;
  /** Precio mínimo con IGV por segmento (solo si pricesEnabled). */
  fromPrice: Partial<Record<EventType, number>>;
  /** Tarifario con IGV por segmento, tipo de día y temporada (solo si pricesEnabled). */
  rates: {
    eventType: EventType;
    dayType: string;
    season: string;
    guestsMax: number;
    gross: number;
  }[];
  ruc: string | null;
  companyAddress: string | null;
  privacyEmail: string | null;
  anpdCode: string | null;
  address: string | null;
  mapsUrl: string | null;
  social: { instagram?: string; facebook?: string; tiktok?: string };
};

const EMPTY: VenueInfo = {
  capacity: { cocktail: null, banquet: null, full_day: null },
  reopeningDate: null,
  reopeningUpcoming: false,
  depositPct: null,
  balanceDueDays: null,
  holdHours: null,
  guaranteeAmounts: {},
  plannerMaxHolds: null,
  plannerProtectionDays: null,
  plannerCommissionRate: null,
  commissionPaymentDays: null,
  slotHours: {},
  pricesEnabled: false,
  fromPrice: {},
  rates: [],
  ruc: null,
  companyAddress: null,
  privacyEmail: null,
  anpdCode: null,
  address: null,
  mapsUrl: null,
  social: {},
};

const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function venueInfo(): Promise<VenueInfo> {
  "use cache";
  cacheLife("hours");
  cacheTag("public-settings");
  const slug = process.env.OASIS_VENUE_SLUG ?? "oasis-pachacamac";
  try {
    return await withDb({ kind: "service" }, async (sql) => {
      const rows = await sql<{ key: string; value: unknown }>(
        `select s.key, s.value from settings s join venues v on v.id = s.venue_id where v.slug = $1`,
        [slug],
      );
      const s = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
      const igv = Number(s.igv_rate ?? 0.18);
      const pricesEnabled = s.public_prices_enabled === true;
      const cards = pricesEnabled
        ? await sql<{
            eventType: EventType;
            dayType: string;
            season: string;
            guestsMax: number;
            net: number;
          }>(
            `select r.event_type as "eventType", r.day_type as "dayType", r.season, r.guests_max as "guestsMax",
                    (r.price_net + r.price_per_guest_net * r.guests_min)::float8 as net
               from rate_cards r join venues v on v.id = r.venue_id
              where v.slug = $1 and r.slot = 'full_day' and r.valid_from <= current_date
                and (r.valid_to is null or r.valid_to >= current_date)`,
            [slug],
          )
        : [];
      const rates = cards.map((c) => ({ ...c, gross: fromNet(c.net, igv).gross }));
      const fromPrice: VenueInfo["fromPrice"] = {};
      for (const r of rates) {
        fromPrice[r.eventType] = Math.min(fromPrice[r.eventType] ?? Infinity, r.gross);
      }
      const capacity = (s.capacity ?? {}) as Record<string, number>;
      const social = (s.social_links ?? {}) as Record<string, string>;
      return {
        capacity: {
          cocktail: num(capacity.cocktail),
          banquet: num(capacity.banquet),
          full_day: num(capacity.full_day),
        },
        reopeningDate: str(s.reopening_date),
        reopeningUpcoming:
          (str(s.reopening_date) ?? "") >
          new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date()),
        depositPct: num(s.deposit_pct),
        balanceDueDays: num(s.balance_due_days),
        holdHours: num(s.hold_hours),
        guaranteeAmounts: (s.guarantee_amounts ?? {}) as VenueInfo["guaranteeAmounts"],
        plannerMaxHolds: num(s.planner_max_active_holds),
        plannerProtectionDays: num(s.planner_protection_days),
        plannerCommissionRate: num(s.planner_commission_rate),
        commissionPaymentDays: num(s.commission_payment_days),
        slotHours: (s.slot_hours ?? {}) as VenueInfo["slotHours"],
        pricesEnabled,
        fromPrice,
        rates,
        ruc: str(s.company_ruc),
        companyAddress: str(s.company_address),
        privacyEmail: str(s.privacy_email),
        anpdCode: str(s.anpd_code),
        address: str(s.venue_address),
        mapsUrl: str(s.maps_url),
        social: Object.fromEntries(
          Object.entries(social).filter(
            ([, v]) => typeof v === "string" && v.startsWith("https://"),
          ),
        ),
      };
    });
  } catch (error) {
    console.warn("venueInfo: sin BD, se usan valores neutros", (error as Error).message);
    return EMPTY;
  }
}
