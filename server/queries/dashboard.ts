import "server-only";
import { withDb, type DbActor } from "@/lib/db";
import {
  addDays,
  averageTicket,
  cac,
  channelBreakEven,
  eachDay,
  monthsSince,
  netRevenuePerAvailableDay,
  nps,
  occupancy,
  occupancyTarget,
  roas,
  round2,
  SOLD_STATUSES,
  type BookingStatus,
  type EventType,
  type OccupancyTargets,
} from "@/lib/domain";

type Channel = "planner" | "direct" | "referral" | "organic";
export type DashboardFilters = { month: string; eventType?: EventType; channel?: Channel };

type Row = {
  id: string;
  date: string;
  status: BookingStatus;
  channel: Channel;
  eventType: EventType;
  net: number;
  gross: number;
  createdMonth: string;
  plannerRate: number | null;
  directCost: number | null;
};

const monthEnd = (m: string) => addDays(`${addMonths(m, 1)}`, -1);
function addMonths(m: string, n: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export async function dashboardData(actor: DbActor, venueId: string, f: DashboardFilters) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  const monthStart = f.month;
  const mEnd = monthEnd(monthStart);
  const yearStart = `${monthStart.slice(0, 4)}-01-01`;
  const yearEnd = `${monthStart.slice(0, 4)}-12-31`;

  return withDb(actor, async (sql) => {
    const settings = Object.fromEntries(
      (
        await sql<{ key: string; value: unknown }>(
          `select key, value from settings where venue_id = $1`,
          [venueId],
        )
      ).map((r) => [r.key, r.value]),
    ) as Record<string, unknown>;
    const commissionRate = Number(settings.planner_commission_rate ?? 0.05);
    const stdCost = Object.values(
      (settings.standard_event_costs as Record<string, number>) ?? {},
    ).reduce((a, b) => a + Number(b), 0);

    const rows = await sql<Row>(
      `select b.id, to_char(b.event_date, 'YYYY-MM-DD') as date, b.status, b.channel, b.event_type as "eventType",
              b.rental_net::float8 as net, b.rental_gross::float8 as gross,
              to_char(date_trunc('month', b.created_at at time zone 'America/Lima'), 'YYYY-MM-DD') as "createdMonth",
              case when b.planner_id is not null then coalesce(
                (select rate::float8 from commissions c where c.booking_id = b.id),
                (select commission_rate::float8 from planners p where p.id = b.planner_id)) end as "plannerRate",
              (select sum(coalesce(actual_amount, standard_amount))::float8 from event_costs ec where ec.booking_id = b.id) as "directCost"
         from bookings b
        where b.venue_id = $1
          and ($2::text is null or b.event_type::text = $2) and ($3::text is null or b.channel::text = $3)`,
      [venueId, f.eventType ?? null, f.channel ?? null],
    );
    const blocks = await sql<{ s: string; e: string }>(
      `select to_char(starts_on, 'YYYY-MM-DD') as s, to_char(ends_on, 'YYYY-MM-DD') as e from blocks where venue_id = $1`,
      [venueId],
    );
    const holidays = new Set(
      (
        await sql<{ d: string }>(
          `select to_char(date, 'YYYY-MM-DD') as d from holidays where type = 'feriado'`,
        )
      ).map((h) => h.d),
    );
    const blocked = new Set(blocks.flatMap((b) => eachDay(b.s, b.e)));
    const live = rows.filter((r) => !(r.status === "expired" || r.status === "cancelled"));
    const dayRows = live.map((r) => ({ date: r.date, status: r.status }));

    // --- Ocupación
    const occMonth = occupancy(monthStart, mEnd, dayRows, blocked, holidays);
    const occYear = occupancy(yearStart, yearEnd, dayRows, blocked, holidays);
    const occ90 = occupancy(today, addDays(today, 89), dayRows, blocked, holidays);
    // --- Metas
    const targets = (settings.occupancy_targets as OccupancyTargets) ?? {
      weekend: { m3: 0.5, m6: 0.7 },
      weekday: { m6: 0.15 },
    };
    const reopening = String(settings.reopening_date ?? "2026-12-17");
    const target = occupancyTarget(monthsSince(reopening, monthStart), targets);
    const series = Array.from({ length: 12 }, (_, i) => {
      const m = addMonths(yearStart, i);
      const o = occupancy(m, monthEnd(m), dayRows, blocked, holidays);
      const t = occupancyTarget(monthsSince(reopening, m), targets);
      return {
        month: m,
        weekend: o.weekend.rate,
        weekday: o.weekday.rate,
        targetWeekend: t.weekend,
        targetWeekday: t.weekday,
      };
    });

    // --- Dinero del mes (por fecha del evento)
    const soldMonth = live.filter(
      (r) => SOLD_STATUSES.includes(r.status) && r.date >= monthStart && r.date <= mEnd,
    );
    const revenueNet = round2(soldMonth.reduce((a, r) => a + r.net, 0));
    const commissions = round2(
      soldMonth.reduce(
        (a, r) => a + (r.plannerRate !== null ? r.net * (r.plannerRate ?? commissionRate) : 0),
        0,
      ),
    );
    const directCosts = round2(soldMonth.reduce((a, r) => a + (r.directCost ?? stdCost), 0));
    const nrpad = netRevenuePerAvailableDay({
      revenueNet,
      commissions,
      directCosts,
      availableDays: occMonth.total.available,
    });
    const ticket = averageTicket(soldMonth.map((r) => r.net));
    const margin = soldMonth.length
      ? round2((revenueNet - commissions - directCosts) / soldMonth.length)
      : null;

    // --- Canal directo: CAC vs 5 % del ticket (cerrados creados en el mes)
    const [spendRow] = await sql<{ spend: number }>(
      `select coalesce(sum(s.amount), 0)::float8 as spend from campaign_spend s join campaigns c on c.id = s.campaign_id
        where c.venue_id = $1 and s.month = $2`,
      [venueId, monthStart],
    );
    const directClosed = rows.filter(
      (r) =>
        r.channel === "direct" && SOLD_STATUSES.includes(r.status) && r.createdMonth === monthStart,
    );
    const cacValue = cac(spendRow.spend, directClosed.length);
    const breakEven = channelBreakEven({
      cac: cacValue,
      averageTicketNet: ticket ?? averageTicket(directClosed.map((r) => r.net)),
      commissionRate,
    });
    const roasValue = roas(
      directClosed.reduce((a, r) => a + r.net, 0),
      spendRow.spend,
    );

    // --- Mezcla de canales (eventos vendidos del mes)
    const mix = (["planner", "direct", "referral", "organic"] as Channel[]).map((c) => ({
      channel: c,
      events: soldMonth.filter((r) => r.channel === c).length,
    }));

    // --- Pipeline en S/ por estado (eventos futuros)
    const pipeline = (["prebooked", "reserved", "confirmed"] as BookingStatus[]).map((s) => ({
      status: s,
      gross: round2(
        live.filter((r) => r.status === s && r.date >= today).reduce((a, r) => a + r.gross, 0),
      ),
      count: live.filter((r) => r.status === s && r.date >= today).length,
    }));

    // --- Embudo por canal (leads creados en el mes)
    const funnel = await sql<{
      channel: Channel;
      leads: number;
      contacted: number;
      quoted: number;
      won: number;
    }>(
      `select channel, count(*)::int as leads,
              count(*) filter (where stage <> 'new')::int as contacted,
              count(*) filter (where stage in ('quoted','prebooked','reserved','contracted','done','settled'))::int as quoted,
              count(*) filter (where stage in ('reserved','contracted','done','settled'))::int as won
         from leads where venue_id = $1 and created_at >= $2::date and created_at < ($3::date + 1)
          and ($4::text is null or event_type::text = $4) and ($5::text is null or channel::text = $5)
        group by channel`,
      [venueId, monthStart, mEnd, f.eventType ?? null, f.channel ?? null],
    );
    const lost = await sql<{ reason: string; n: number }>(
      `select lost_reason as reason, count(*)::int as n from leads where venue_id = $1 and stage = 'lost' and lost_reason is not null
        group by 1 order by 2 desc limit 5`,
      [venueId],
    );
    const [pending] = await sql<{ total: number }>(
      `select coalesce(sum(amount), 0)::float8 as total from commissions where status <> 'paid'`,
    );
    const npsScores = (await sql<{ score: number }>(`select score from nps_responses`)).map(
      (r) => r.score,
    );

    return {
      today,
      occMonth,
      occYear,
      occ90,
      series,
      target,
      money: {
        revenueNet,
        commissions,
        directCosts,
        nrpad,
        ticket,
        margin,
        eventsSold: soldMonth.length,
      },
      channel: {
        spend: spendRow.spend,
        directClosed: directClosed.length,
        cac: cacValue,
        roas: roasValue,
        ...breakEven,
        commissionRate,
      },
      mix,
      pipeline,
      funnel,
      lost,
      commissionsPending: pending.total,
      nps: { value: nps(npsScores), responses: npsScores.length },
    };
  });
}
