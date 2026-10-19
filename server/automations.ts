import "server-only";
import { SITE_URL } from "@/lib/content/seo";
import { npsToken } from "@/lib/nps";
import { withDb, type Sql } from "@/lib/db";
import {
  addDays,
  balanceOf,
  dueReminders,
  formatDate,
  formatPEN,
  isBusinessTime,
  slaBreaches,
  STATUS_LABEL,
  weekKey,
  type BookingStatus,
  type BusinessHours,
  type EventType,
} from "@/lib/domain";
import { sendEmail } from "@/lib/email";
import {
  TEMPLATES,
  type BookingCtx,
  type BookingTemplateId,
  type DigestCtx,
  type TemplateId,
} from "@/lib/templates";
import { CHANNEL_LABEL, EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { dashboardData } from "@/server/queries/dashboard";
import { activeVenue } from "@/server/venue";

// Automatizaciones (OASIS.md §6.5). Corren como sistema (service_role, actor "automatizaciones"),
// solo AVISAN: nunca cambian tarifas, validan pagos ni pagan comisiones (CLAUDE.md regla 6).

const ACTOR = { kind: "service", actorType: "system", actorName: "automatizaciones" } as const;

export type RunReport = {
  job: string;
  queued: number;
  sent: number;
  skipped: number;
  failed: number;
};

const limaToday = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(now);

const siteUrl = () => SITE_URL;

async function settingsOf(sql: Sql, venueId: string) {
  const rows = await sql<{ key: string; value: unknown }>(
    `select key, value from settings where venue_id = $1`,
    [venueId],
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
}

async function staffEmails(sql: Sql, roles: string[]): Promise<string[]> {
  const rows = await sql<{ email: string }>(
    `select distinct email from profiles where role::text = any($1) and email is not null order by email`,
    [roles],
  );
  return rows.map((r) => r.email);
}

type Enqueue = {
  venueId: string;
  kind: string;
  channel: "email" | "whatsapp";
  template: TemplateId;
  dedupeKey: string;
  recipient: string | null;
  subject: string | null;
  body: string;
  bookingId?: string;
  leadId?: string;
};

/** Inserta en el outbox; la clave (dedupe_key, channel) evita duplicados entre corridas. */
async function enqueue(sql: Sql, n: Enqueue): Promise<boolean> {
  const rows = await sql(
    `insert into notifications (venue_id, kind, channel, booking_id, lead_id, recipient, template,
                                template_version, subject, body, dedupe_key, status, error)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             case when $6::text is null then 'skipped' else 'queued' end,
             case when $6::text is null then 'Sin dato de contacto' end)
     on conflict (dedupe_key, channel) do nothing returning id`,
    [
      n.venueId,
      n.kind,
      n.channel,
      n.bookingId ?? null,
      n.leadId ?? null,
      n.recipient,
      n.template,
      TEMPLATES[n.template].version,
      n.subject,
      n.body,
      n.dedupeKey,
    ],
  );
  return rows.length > 0;
}

/** Envía los correos en cola. Los WhatsApp quedan para envío manual desde /admin/avisos. */
export async function deliverQueued(limit = 50) {
  const queued = await withDb(ACTOR, (sql) =>
    sql<{ id: string; recipient: string; subject: string; body: string }>(
      `select id, recipient, subject, body from notifications
        where status = 'queued' and channel = 'email' order by created_at limit $1`,
      [limit],
    ),
  );
  const tally = { sent: 0, skipped: 0, failed: 0 };
  for (const n of queued) {
    const res = await sendEmail({
      to: n.recipient.split(",").map((s) => s.trim()),
      subject: n.subject,
      text: n.body,
    });
    tally[res.status] += 1;
    await withDb(ACTOR, (sql) =>
      sql(
        `update notifications set status = $2, error = $3, provider_id = $4,
                sent_at = case when $2 = 'sent' then now() end
          where id = $1`,
        [
          n.id,
          res.status,
          res.status === "sent" ? null : res.error,
          res.status === "sent" ? res.providerId : null,
        ],
      ),
    );
  }
  return tally;
}

type BookingRow = {
  id: string;
  status: BookingStatus;
  eventType: EventType;
  eventDate: string;
  balanceDueOn: string | null;
  rentalGross: number;
  paidValidated: number;
  guests: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  plannerName: string | null;
  plannerEmail: string | null;
  plannerPhone: string | null;
};

const BOOKING_COLUMNS = `select b.id, b.status, b.event_type as "eventType", to_char(b.event_date, 'YYYY-MM-DD') as "eventDate",
       to_char(b.balance_due_on, 'YYYY-MM-DD') as "balanceDueOn", b.rental_gross::float8 as "rentalGross",
       public.booking_paid(b.id)::float8 as "paidValidated", b.guests,
       c.full_name as "clientName", c.email as "clientEmail", c.phone as "clientPhone",
       p.contact_name as "plannerName", p.email as "plannerEmail", p.phone as "plannerPhone"
  from bookings b left join clients c on c.id = b.client_id left join planners p on p.id = b.planner_id`;

/** Encola un aviso al cliente (o a su planner) por correo y WhatsApp. Devuelve cuántos son nuevos. */
async function notifyCustomer(
  sql: Sql,
  venue: { id: string; name: string },
  b: BookingRow,
  kind: BookingTemplateId,
  dedupeKey: string,
  extra: Partial<BookingCtx> = {},
  settings: Record<string, unknown> = {},
): Promise<number> {
  // En reservas de planner el contacto con el cliente lo lleva el planner (S29)
  const viaPlanner = b.plannerName !== null;
  const ctx: BookingCtx = {
    venueName: venue.name,
    recipientName: (viaPlanner ? b.plannerName : b.clientName)?.split(" ")[0] ?? "",
    eventLabel: `${EVENT_TYPE_LABEL[b.eventType].toLowerCase()} del ${formatDate(b.eventDate)}`,
    eventDate: formatDate(b.eventDate),
    balance: formatPEN(balanceOf(b)),
    balanceDueOn: b.balanceDueOn ? formatDate(b.balanceDueOn) : null,
    guests: b.guests,
    musicCutoff: typeof settings.music_cutoff_time === "string" ? settings.music_cutoff_time : null,
    ...extra,
  };
  const t = TEMPLATES[kind];
  const common = { venueId: venue.id, kind, template: kind, dedupeKey, bookingId: b.id };
  let n = 0;
  if (
    await enqueue(sql, {
      ...common,
      channel: "email",
      recipient: viaPlanner ? b.plannerEmail : b.clientEmail,
      subject: t.subject(ctx),
      body: t.email(ctx),
    })
  )
    n += 1;
  if (
    await enqueue(sql, {
      ...common,
      channel: "whatsapp",
      recipient: viaPlanner ? b.plannerPhone : b.clientPhone,
      subject: null,
      body: t.whatsapp(ctx),
    })
  )
    n += 1;
  return n;
}

/** Diario 08:00 Lima: saldos, D-7/D-1, encuesta NPS post-evento y resumen de operación. */
export async function runDaily(now = new Date()): Promise<RunReport> {
  const venue = await activeVenue();
  const today = limaToday(now);
  let queued = 0;

  await withDb(ACTOR, async (sql) => {
    const s = await settingsOf(sql, venue.id);
    const bookings = await sql<BookingRow>(
      `${BOOKING_COLUMNS} where b.venue_id = $1 and b.status in ('reserved', 'confirmed') and b.event_date >= $2::date`,
      [venue.id, today],
    );
    const byId = new Map(bookings.map((b) => [b.id, b]));
    const reminders = dueReminders(bookings, today, {
      balanceNoticeDays: Number(s.balance_notice_days ?? 3),
    });

    for (const r of reminders) {
      queued += await notifyCustomer(
        sql,
        venue,
        byId.get(r.bookingId)!,
        r.kind,
        r.dedupeKey,
        {},
        s,
      );
    }

    // Encuesta NPS a eventos realizados en los últimos 7 días sin respuesta
    const done = await sql<BookingRow>(
      `${BOOKING_COLUMNS} where b.venue_id = $1 and b.status in ('done', 'settled')
          and b.done_at > now() - interval '7 days'
          and not exists (select 1 from nps_responses n where n.booking_id = b.id)`,
      [venue.id],
    );
    for (const b of done) {
      queued += await notifyCustomer(sql, venue, b, "nps_request", `nps_request:${b.id}`, {
        link: `${siteUrl()}/encuesta/${npsToken(b.id)}`,
      });
    }

    // Resumen de operación para staff
    const line = (b: BookingRow) =>
      `${formatDate(b.eventDate)} · ${EVENT_TYPE_LABEL[b.eventType]} · ${STATUS_LABEL[b.status]} · ${b.guests} inv. · saldo ${formatPEN(balanceOf(b))}`;
    const holds = await sql<{ eventDate: string; eventType: EventType; expires: string }>(
      `select to_char(event_date, 'YYYY-MM-DD') as "eventDate", event_type as "eventType",
              to_char(hold_expires_at at time zone 'America/Lima', 'DD/MM HH24:MI') as expires
         from bookings where venue_id = $1 and status = 'prebooked'
          and hold_expires_at between now() and now() + interval '24 hours' order by hold_expires_at`,
      [venue.id],
    );
    const complaints = await sql<{ code: string; kind: string; dueOn: string }>(
      `select code, kind, to_char(due_on, 'YYYY-MM-DD') as "dueOn" from complaints
        where venue_id = $1 and responded_at is null and due_on <= $2::date + 5 order by due_on`,
      [venue.id, today],
    );
    const ctx: DigestCtx = {
      venueName: venue.name,
      date: formatDate(today),
      adminUrl: `${siteUrl()}/admin/calendario`,
      items: [
        {
          title: "Eventos de mañana (D-1)",
          lines: bookings.filter((b) => b.eventDate === addDays(today, 1)).map(line),
        },
        {
          title: "Eventos en 7 días (D-7)",
          lines: bookings.filter((b) => b.eventDate === addDays(today, 7)).map(line),
        },
        {
          title: "Saldos vencidos",
          lines: reminders
            .filter((r) => r.kind === "balance_overdue")
            .map((r) => line(byId.get(r.bookingId)!)),
        },
        {
          title: "Libro de Reclamaciones: por responder (vence en 5 días o menos)",
          lines: complaints.map((c) => `${c.code} · ${c.kind} · vence ${formatDate(c.dueOn)}`),
        },
        {
          title: "Pre-reservas que vencen en 24 h",
          lines: holds.map(
            (h) =>
              `${formatDate(h.eventDate)} · ${EVENT_TYPE_LABEL[h.eventType]} · vence ${h.expires}`,
          ),
        },
      ],
    };
    const staff = await staffEmails(sql, ["admin", "ops"]);
    if (
      await enqueue(sql, {
        venueId: venue.id,
        kind: "ops_daily",
        channel: "email",
        template: "ops_daily",
        dedupeKey: `ops_daily:${today}`,
        recipient: staff.length ? staff.join(", ") : null,
        subject: TEMPLATES.ops_daily.subject(ctx),
        body: TEMPLATES.ops_daily.email(ctx),
      })
    )
      queued += 1;
  });

  return { job: "diario", queued, ...(await deliverQueued()) };
}

/** Cada 15 min en horario comercial: leads nuevos que superaron el SLA de primera respuesta. */
export async function runSla(now = new Date(), opts: { force?: boolean } = {}): Promise<RunReport> {
  const venue = await activeVenue();
  let queued = 0;
  await withDb(ACTOR, async (sql) => {
    const s = await settingsOf(sql, venue.id);
    const hours = (s.business_hours as BusinessHours) ?? {
      days: [1, 2, 3, 4, 5, 6],
      start: "09:00",
      end: "19:00",
    };
    // El cron corre cada 15 min todo el día; fuera del horario comercial no hay alertas (S30)
    if (!opts.force && !isBusinessTime(now, hours)) return;
    const leads = await sql<{
      id: string;
      stage: string;
      createdAt: Date;
      firstResponseAt: Date | null;
      channel: keyof typeof CHANNEL_LABEL;
      name: string | null;
      phone: string | null;
      eventType: EventType | null;
    }>(
      `select l.id, l.stage::text, l.created_at as "createdAt", l.first_response_at as "firstResponseAt",
              l.channel, c.full_name as name, c.phone, l.event_type as "eventType"
         from leads l left join clients c on c.id = l.client_id
        where l.venue_id = $1 and l.stage = 'new' and l.first_response_at is null
          and l.created_at > now() - interval '7 days'`,
      [venue.id],
    );
    const breaches = slaBreaches(leads, now, hours, Number(s.first_response_sla_minutes ?? 15));
    if (breaches.length === 0) return;
    const staff = await staffEmails(sql, ["admin", "ops"]);
    for (const br of breaches) {
      const l = leads.find((x) => x.id === br.leadId)!;
      const ctx: DigestCtx = {
        venueName: venue.name,
        date: formatDate(limaToday(now)),
        adminUrl: `${siteUrl()}/admin/crm/${l.id}`,
        items: [
          {
            title: `${l.name ?? "Lead sin nombre"} · ${CHANNEL_LABEL[l.channel]}`,
            lines: [
              `${br.minutes} minutos hábiles sin respuesta`,
              l.eventType ? EVENT_TYPE_LABEL[l.eventType] : "Tipo de evento sin definir",
              l.phone ? `Teléfono: ${l.phone}` : "Sin teléfono",
            ],
          },
        ],
      };
      if (
        await enqueue(sql, {
          venueId: venue.id,
          kind: "lead_sla",
          channel: "email",
          template: "lead_sla",
          dedupeKey: br.dedupeKey,
          leadId: l.id,
          recipient: staff.length ? staff.join(", ") : null,
          subject: TEMPLATES.lead_sla.subject(ctx),
          body: TEMPLATES.lead_sla.email(ctx),
        })
      )
        queued += 1;
    }
  });
  return { job: "sla", queued, ...(await deliverQueued()) };
}

/** Lunes 08:00 Lima: resumen para socios (ocupación a 90 días, pipeline, leads, CAC, alertas). */
export async function runWeekly(now = new Date()): Promise<RunReport> {
  const venue = await activeVenue();
  const today = limaToday(now);
  const d = await dashboardData(ACTOR, venue.id, { month: `${today.slice(0, 7)}-01` });
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 1000) / 10} %`);
  let queued = 0;

  await withDb(ACTOR, async (sql) => {
    const [leads] = await sql<{ total: number; won: number; overdue: number }>(
      `select count(*)::int as total,
              count(*) filter (where stage in ('reserved','contracted','done','settled'))::int as won,
              count(*) filter (where stage = 'new' and first_response_at is null)::int as overdue
         from leads where venue_id = $1 and created_at > now() - interval '7 days'`,
      [venue.id],
    );
    const [overdue] = await sql<{ n: number }>(
      `select count(*)::int as n from bookings b where b.venue_id = $1 and b.status in ('reserved','confirmed')
          and b.balance_due_on < $2::date and b.rental_gross > public.booking_paid(b.id)`,
      [venue.id, today],
    );
    const alerts = [
      d.channel.adsCostMoreThanCommission
        ? "La pauta cuesta más que la comisión de un planner (CAC sobre el 5 %)."
        : null,
      overdue.n ? `${overdue.n} reserva(s) con saldo vencido.` : null,
      leads.overdue ? `${leads.overdue} lead(s) de la semana sin primera respuesta.` : null,
      d.target.weekend !== null && (d.occMonth.weekend.rate ?? 0) < d.target.weekend * 0.8
        ? `Ocupación V-S-D del mes (${pct(d.occMonth.weekend.rate)}) debajo del 80 % de la meta (${pct(d.target.weekend)}).`
        : null,
    ].filter((a): a is string => a !== null);
    const ctx: DigestCtx = {
      venueName: venue.name,
      date: formatDate(today),
      adminUrl: `${siteUrl()}/admin/dashboard`,
      items: [
        {
          title: "Ocupación comprometida a 90 días",
          lines: [
            `Total ${pct(d.occ90.total.rate)} · V-S-D ${pct(d.occ90.weekend.rate)} · L-J ${pct(d.occ90.weekday.rate)}`,
          ],
        },
        {
          title: "Pipeline (eventos futuros, con IGV)",
          lines: d.pipeline.map(
            (p) => `${STATUS_LABEL[p.status]}: ${formatPEN(p.gross)} (${p.count})`,
          ),
        },
        {
          title: "Leads de los últimos 7 días",
          lines: [`${leads.total} nuevos · ${leads.won} separados`],
        },
        {
          title: "Canal directo del mes",
          lines: [
            `Pauta ${formatPEN(d.channel.spend)} · CAC ${d.channel.cac === null ? "—" : formatPEN(d.channel.cac)} · equilibrio ${d.channel.threshold === null ? "—" : formatPEN(d.channel.threshold)}`,
          ],
        },
        { title: "Alertas", lines: alerts },
      ],
    };
    const admins = await staffEmails(sql, ["admin"]);
    if (
      await enqueue(sql, {
        venueId: venue.id,
        kind: "weekly_summary",
        channel: "email",
        template: "weekly_summary",
        dedupeKey: `weekly_summary:${weekKey(today)}`,
        recipient: admins.length ? admins.join(", ") : null,
        subject: TEMPLATES.weekly_summary.subject(ctx),
        body: TEMPLATES.weekly_summary.email(ctx),
      })
    )
      queued += 1;
  });
  return { job: "semanal", queued, ...(await deliverQueued()) };
}

/** Alerta inmediata al staff (p. ej. derivación del Recepcionista). Idempotente por clave. */
export async function alertStaff(input: {
  venueId: string;
  venueName: string;
  dedupeKey: string;
  title: string;
  lines: string[];
  path: string;
  leadId?: string | null;
}) {
  await withDb(ACTOR, async (sql) => {
    const staff = await staffEmails(sql, ["admin", "ops"]);
    const ctx: DigestCtx = {
      venueName: input.venueName,
      date: formatDate(limaToday(new Date())),
      adminUrl: `${siteUrl()}${input.path}`,
      items: [{ title: input.title, lines: input.lines }],
    };
    await enqueue(sql, {
      venueId: input.venueId,
      kind: "agent_handoff",
      channel: "email",
      template: "agent_handoff",
      dedupeKey: input.dedupeKey,
      leadId: input.leadId ?? undefined,
      recipient: staff.length ? staff.join(", ") : null,
      subject: TEMPLATES.agent_handoff.subject(ctx),
      body: TEMPLATES.agent_handoff.email(ctx),
    });
  });
  await deliverQueued(5);
}

export const JOBS = { diario: runDaily, sla: runSla, semanal: runWeekly } as const;
export type JobName = keyof typeof JOBS;
