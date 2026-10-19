// Herramienta de los agentes por cadencia (tareas programadas de Claude Code, ver agents/README.md).
//
//   node scripts/agent.mts snapshot <agente>                    # contexto de solo lectura (JSON)
//   node scripts/agent.mts propose <agente> <tipo> <título> <archivo-con-el-detalle.md>
//
// Conexión: DATABASE_URL (Postgres) o, en el entorno de Claude Code, SUPABASE_PROJECT_REF vía
// Management API (el proxy inyecta el token). Los agentes SOLO leen y proponen: nunca escriben en
// reservas, pagos, tarifas ni comisiones (CLAUDE.md regla 6).
import { readFileSync } from "node:fs";
import pg from "pg";

const [cmd, agent, ...rest] = process.argv.slice(2);
const AGENTS = [
  "closer",
  "revenue",
  "growth",
  "planners",
  "controller",
  "contenido",
  "editor",
  "disenador",
];
if (!["snapshot", "propose"].includes(cmd) || !AGENTS.includes(agent)) {
  console.error(`Uso: snapshot|propose <${AGENTS.join("|")}> …`);
  process.exit(1);
}

const literal = (v: unknown) =>
  v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`;

async function query<T>(sql: string): Promise<T[]> {
  if (process.env.DATABASE_URL) {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const res = await client.query(sql);
      const last = Array.isArray(res) ? res[res.length - 1] : res;
      return last.rows as T[];
    } finally {
      await client.end();
    }
  }
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!ref) throw new Error("Falta DATABASE_URL o SUPABASE_PROJECT_REF");
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
  return body ? (JSON.parse(body) as T[]) : [];
}

const json = async (sql: string) =>
  (await query<{ j: unknown }>(`select coalesce(json_agg(t), '[]') as j from (${sql}) t`))[0].j;

const today = `(now() at time zone 'America/Lima')::date`;

// Contexto común + específico por agente. Sin datos de contacto: los agentes trabajan con ids.
const SECTIONS: Record<string, Record<string, string>> = {
  common: {
    settings: `select key, value from settings where key in ('occupancy_targets','reopening_date','discount_cap_pct','monthly_ad_budget','planner_commission_rate','hold_hours')`,
    pipeline: `select status, count(*) as n, sum(rental_gross) as gross from bookings where event_date >= ${today} and status in ('prebooked','reserved','confirmed') group by 1`,
    proposals_open: `select agent, kind, title, created_at from agent_proposals where status = 'proposed' order by created_at desc limit 20`,
  },
  closer: {
    quoted_without_activity: `select l.id, l.event_type, l.event_date, l.channel, max(a.created_at) as last_activity from leads l left join activities a on a.lead_id = l.id where l.stage in ('contacted','quoted') group by l.id having coalesce(max(a.created_at), l.created_at) < now() - interval '3 days' order by l.event_date nulls last limit 50`,
    holds_expiring: `select id, event_date, event_type, hold_expires_at from bookings where status = 'prebooked' and hold_expires_at < now() + interval '24 hours' order by hold_expires_at`,
    visits_requested: `select lead_id, notes, due_at from activities where kind = 'task' and done_at is null and notes ilike '%visit%' order by due_at limit 30`,
  },
  revenue: {
    free_days_15_60: `select d::date as day, extract(isodow from d) as dow from generate_series(${today} + 15, ${today} + 60, interval '1 day') d where not exists (select 1 from bookings bk where bk.event_date = d::date and bk.status not in ('cancelled','expired')) and not exists (select 1 from blocks b where d::date between b.starts_on and b.ends_on)`,
    rate_cards: `select event_type, day_type, season, guests_min, guests_max, price_net, is_placeholder from rate_cards`,
    sold_last_90: `select event_type, extract(isodow from event_date) as dow, rental_net, discount_pct from bookings where status in ('reserved','confirmed','done','settled') and event_date > ${today} - 90`,
  },
  growth: {
    campaigns: `select c.utm_campaign, c.platform, s.month, s.amount, s.clicks, (select count(*) from leads l where l.utm_campaign = c.utm_campaign and date_trunc('month', l.created_at) = s.month) as leads, (select count(*) from leads l where l.utm_campaign = c.utm_campaign and l.stage in ('reserved','contracted','done','settled')) as won from campaigns c join campaign_spend s on s.campaign_id = c.id where s.month >= date_trunc('month', ${today}) - interval '3 months' order by s.month desc`,
    leads_by_channel_30d: `select channel, utm_source, count(*) as n, count(*) filter (where stage in ('reserved','contracted','done','settled')) as won from leads where created_at > now() - interval '30 days' group by 1, 2`,
    lost_reasons: `select lost_reason, count(*) from leads where stage = 'lost' and created_at > now() - interval '90 days' group by 1 order by 2 desc`,
  },
  planners: {
    planners: `select p.id, p.business_name, p.status, (select count(*) from bookings b where b.planner_id = p.id and b.status in ('reserved','confirmed','done','settled')) as sold, (select max(created_at) from leads l where l.planner_id = p.id) as last_lead from planners p order by sold desc`,
    applications: `select id, business_name, events_per_year, created_at from planner_applications order by created_at desc limit 20`,
    commissions: `select planner_id, status, sum(amount) from commissions group by 1, 2`,
  },
  controller: {
    payments_pending: `select p.id, p.booking_id, p.kind, p.amount, p.paid_on, p.voucher_path is not null as has_voucher from payments p where p.status = 'pending' order by p.paid_on`,
    balances_due: `select id, event_date, balance_due_on, rental_gross, public.booking_paid(id) as paid from bookings where status in ('reserved','confirmed') and balance_due_on <= ${today} + 15 and rental_gross > public.booking_paid(id)`,
    commissions_payable: `select id, planner_id, amount, payable_on from commissions where status = 'payable'`,
    costs_vs_standard: `select booking_id, category, standard_amount, actual_amount from event_costs where actual_amount is not null and actual_amount > standard_amount * 1.15`,
  },
  contenido: {
    upcoming_events: `select event_type, event_date, guests from bookings where status in ('confirmed','done') and event_date between ${today} - 30 and ${today} + 30`,
    nps: `select score, comment, created_at from nps_responses order by created_at desc limit 20`,
    segments_demand: `select event_type, count(*) from leads where created_at > now() - interval '60 days' group by 1`,
  },
};

if (cmd === "snapshot") {
  const out: Record<string, unknown> = { agent, generated_at: new Date().toISOString() };
  for (const [name, sql] of Object.entries({ ...SECTIONS.common, ...SECTIONS[agent] })) {
    out[name] = await json(sql);
  }
  console.log(JSON.stringify(out, null, 2));
} else {
  const [kind, title, file] = rest;
  if (!kind || !title || !file) {
    console.error("Uso: propose <agente> <tipo> <título> <archivo.md>");
    process.exit(1);
  }
  const body = readFileSync(file, "utf8").slice(0, 20_000);
  const [row] = await query<{ id: string }>(`
    select set_config('oasis.actor_type', 'agent', true), set_config('oasis.actor_name', ${literal(agent)}, true);
    insert into agent_proposals (venue_id, agent, kind, title, body)
    select id, ${literal(agent)}, ${literal(kind)}, ${literal(title.slice(0, 200))}, ${literal(body)}
      from venues where is_active order by created_at limit 1
    returning id;`);
  console.log(`✓ Propuesta registrada ${row?.id ?? ""}`);
}
