"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { aggregateCampaignSpend, csvRecords, parseHistoricalEvents, round2 } from "@/lib/domain";
import { activeVenue } from "@/server/venue";

export type FinanceResult = { ok: boolean; message?: string; errors?: string[] };

const month = z.string().regex(/^\d{4}-\d{2}$/, "Elige el mes.");

export async function addCampaign(
  _: FinanceResult | null,
  formData: FormData,
): Promise<FinanceResult> {
  const user = await requireStaff();
  const parsed = z
    .object({
      name: z.string().trim().min(3, "Escribe el nombre.").max(120),
      platform: z.enum(["meta", "google", "tiktok", "directory", "other"]),
      utmCampaign: z
        .string()
        .trim()
        .min(2, "Escribe el código utm_campaign.")
        .max(150)
        .regex(/^[\w-]+$/, "Usa letras, números y guiones."),
      segment: z.enum(["wedding", "social", "corporate", "family_day", ""]).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const venue = await activeVenue();
  try {
    await withDb({ kind: "user", userId: user.id }, (sql) =>
      sql(
        `insert into campaigns (venue_id, platform, name, utm_campaign, segment) values ($1, $2, $3, $4, $5)`,
        [
          venue.id,
          parsed.data.platform,
          parsed.data.name,
          parsed.data.utmCampaign,
          parsed.data.segment || null,
        ],
      ),
    );
  } catch {
    return { ok: false, message: "Ya existe una campaña con ese código." };
  }
  refresh();
  return { ok: true, message: "Campaña creada." };
}

export async function addSpend(
  _: FinanceResult | null,
  formData: FormData,
): Promise<FinanceResult> {
  const user = await requireStaff();
  const parsed = z
    .object({
      campaignId: z.uuid({ error: "Elige la campaña." }),
      month,
      amount: z.coerce.number().min(0),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into campaign_spend (campaign_id, month, amount) values ($1, $2, $3)
       on conflict (campaign_id, month) do update set amount = excluded.amount, source = 'manual'`,
      [parsed.data.campaignId, `${parsed.data.month}-01`, parsed.data.amount],
    ),
  );
  refresh();
  return { ok: true, message: "Inversión registrada." };
}

export async function importSpendCsv(
  _: FinanceResult | null,
  formData: FormData,
): Promise<FinanceResult> {
  const user = await requireStaff();
  const file = formData.get("file");
  const platform = z.enum(["meta", "google"]).parse(formData.get("platform"));
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "Elige el archivo CSV." };
  if (file.size > 2_000_000) return { ok: false, message: "El archivo supera 2 MB." };
  const { rows, errors } = aggregateCampaignSpend(csvRecords(await file.text()));
  if (rows.length === 0) return { ok: false, message: "No se encontraron filas válidas.", errors };
  const venue = await activeVenue();
  await withDb({ kind: "user", userId: user.id }, async (sql) => {
    for (const r of rows) {
      const code = r.campaign
        .toLowerCase()
        .replace(/[^\w-]+/g, "-")
        .slice(0, 150);
      const [c] = await sql<{ id: string }>(
        `insert into campaigns (venue_id, platform, name, utm_campaign) values ($1, $2, $3, $4)
         on conflict (venue_id, utm_campaign) do update set name = campaigns.name returning id`,
        [venue.id, platform, r.campaign, code],
      );
      await sql(
        `insert into campaign_spend (campaign_id, month, amount, impressions, clicks, source) values ($1, $2, $3, $4, $5, $6)
         on conflict (campaign_id, month) do update
           set amount = excluded.amount, impressions = excluded.impressions, clicks = excluded.clicks, source = excluded.source`,
        [
          c.id,
          r.month,
          r.amount,
          r.impressions,
          r.clicks,
          platform === "meta" ? "csv_meta" : "csv_google",
        ],
      );
    }
  });
  refresh();
  return { ok: true, message: `Se importaron ${rows.length} registros de inversión.`, errors };
}

export async function addFixedCost(
  _: FinanceResult | null,
  formData: FormData,
): Promise<FinanceResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      month,
      category: z.enum([
        "caretaker",
        "gardening",
        "pool",
        "utilities",
        "insurance",
        "internet",
        "other",
      ]),
      amount: z.coerce.number().min(0),
      notes: z.string().max(200).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const venue = await activeVenue();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into fixed_costs (venue_id, month, category, amount, notes) values ($1, $2, $3, $4, $5)
       on conflict (venue_id, month, category) do update set amount = excluded.amount, notes = excluded.notes`,
      [
        venue.id,
        `${parsed.data.month}-01`,
        parsed.data.category,
        parsed.data.amount,
        parsed.data.notes || null,
      ],
    ),
  );
  refresh();
  return { ok: true, message: "Costo fijo guardado." };
}

export async function addCapex(
  _: FinanceResult | null,
  formData: FormData,
): Promise<FinanceResult> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      description: z.string().trim().min(3, "Describe la inversión.").max(200),
      amount: z.coerce.number().positive("El monto debe ser mayor a 0."),
      spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha."),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const venue = await activeVenue();
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into capex_items (venue_id, description, amount, spent_on) values ($1, $2, $3, $4)`,
      [venue.id, parsed.data.description, parsed.data.amount, parsed.data.spentOn],
    ),
  );
  refresh();
  return { ok: true, message: "Inversión registrada." };
}

/** Eventos históricos ya realizados: quedan como Realizados con pago validado (actor sistema). */
export async function importHistorical(
  _: FinanceResult | null,
  formData: FormData,
): Promise<FinanceResult> {
  const user = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "Elige el archivo CSV." };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  const { ok, errors } = parseHistoricalEvents(csvRecords(await file.text()), today);
  const venue = await activeVenue();
  let imported = 0;
  for (const e of ok) {
    try {
      await withDb(
        { kind: "service", actorType: "system", actorName: `import:${user.email}` },
        async (sql) => {
          const [c] = await sql<{ id: string }>(
            `insert into clients (full_name, phone, email) values ($1, $2, $3) returning id`,
            [e.clientName, e.phone, e.email],
          );
          const [b] = await sql<{ id: string; gross: number }>(
            `insert into bookings (venue_id, client_id, channel, event_type, event_date, guests, rental_list_net, notes)
           values ($1, $2, $3, $4, $5, $6, $7, 'Importado del histórico') returning id, rental_gross::float8 as gross`,
            [venue.id, c.id, e.channel, e.eventType, e.date, e.guests, round2(e.listNet)],
          );
          if (b.gross > 0) {
            await sql(
              `insert into payments (booking_id, kind, amount, method, paid_on, status) values ($1, 'deposit', $2, 'transfer', $3, 'validated')`,
              [b.id, b.gross, e.date],
            );
          }
          await sql(`select public.transition_booking($1, 'reserved')`, [b.id]);
          await sql(`update bookings set contract_signed_at = $2::date where id = $1`, [
            b.id,
            e.date,
          ]);
          await sql(`select public.transition_booking($1, 'confirmed')`, [b.id]);
          await sql(`select public.transition_booking($1, 'done')`, [b.id]);
        },
      );
      imported++;
    } catch (error) {
      const msg = String((error as Error).message);
      errors.push(
        `Fila ${e.line}: ${msg.includes("occupancy_no_overlap") ? "la fecha ya tiene una reserva" : "no se pudo importar"}.`,
      );
    }
  }
  refresh();
  return { ok: imported > 0, message: `Se importaron ${imported} eventos.`, errors };
}
