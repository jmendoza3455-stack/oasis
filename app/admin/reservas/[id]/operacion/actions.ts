"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { ALLOWED_TYPES, putFile, validateUpload } from "@/lib/storage";
import { bookingVenueId } from "@/server/venue";

export type OpsResult = { ok: true } | { ok: false; error: string };

const kind = z.enum(["d7", "d1", "handover", "return"]);
const items = z.array(
  z.object({ label: z.string().max(200), done: z.boolean(), note: z.string().max(300).optional() }),
);

export async function saveChecklist(input: {
  bookingId: string;
  kind: string;
  items: unknown;
  complete: boolean;
}): Promise<OpsResult> {
  const user = await requireStaff();
  const parsed = z
    .object({ bookingId: z.uuid(), kind, items, complete: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Checklist inválido." };
  const d = parsed.data;
  if (d.complete && d.items.some((i) => !i.done))
    return { ok: false, error: "Completa todos los puntos antes de cerrar." };
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into checklists (booking_id, kind, items, completed_at, completed_by)
       values ($1, $2, $3, case when $4 then now() end, case when $4 then $5::uuid end)
       on conflict (booking_id, kind) do update
         set items = excluded.items, completed_at = excluded.completed_at, completed_by = excluded.completed_by`,
      [d.bookingId, d.kind, JSON.stringify(d.items), d.complete, user.id],
    ),
  );
  refresh();
  return { ok: true };
}

async function uploadPhotos(
  userId: string,
  bookingId: string,
  files: File[],
  folder: string,
  docKind: string,
) {
  const venueId = await bookingVenueId(userId, bookingId);
  const keys: string[] = [];
  for (const file of files) {
    const invalid = validateUpload(file);
    if (invalid) throw new Error(invalid);
    const key = await putFile(
      `${folder}/${bookingId}/${randomUUID()}.${ALLOWED_TYPES[file.type]}`,
      file,
    );
    keys.push(key);
  }
  if (keys.length) {
    await withDb({ kind: "service" }, async (sql) => {
      for (const k of keys) {
        await sql(
          `insert into documents (venue_id, booking_id, kind, storage_path) values ($1, $2, $3, $4)`,
          [venueId, bookingId, docKind, k],
        );
      }
    });
  }
  return keys;
}

export async function addActaPhotos(_: OpsResult | null, formData: FormData): Promise<OpsResult> {
  const user = await requireStaff();
  const bookingId = z.uuid().parse(formData.get("bookingId"));
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Elige al menos una foto." };
  try {
    await uploadPhotos(user.id, bookingId, files, "actas", "handover_photo");
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  refresh();
  return { ok: true };
}

export async function addIncident(_: OpsResult | null, formData: FormData): Promise<OpsResult> {
  const user = await requireStaff();
  const parsed = z
    .object({
      bookingId: z.uuid(),
      description: z.string().trim().min(5, "Describe la incidencia."),
      amount: z.coerce.number().min(0).default(0),
      chargeToGuarantee: z.literal("on").optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  let photos: string[] = [];
  try {
    photos = await uploadPhotos(
      user.id,
      parsed.data.bookingId,
      files,
      "incidencias",
      "incident_photo",
    );
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `insert into incidents (booking_id, description, amount, charge_to_guarantee, photos, created_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        parsed.data.bookingId,
        parsed.data.description,
        parsed.data.amount,
        parsed.data.chargeToGuarantee === "on",
        photos,
        user.id,
      ],
    ),
  );
  refresh();
  return { ok: true };
}

export async function saveEventCosts(input: {
  bookingId: string;
  rows: { category: string; standard: number; actual: number | null }[];
}): Promise<OpsResult> {
  const user = await requireStaff();
  const parsed = z
    .object({
      bookingId: z.uuid(),
      rows: z.array(
        z.object({
          category: z.enum([
            "cleaning",
            "staff",
            "security",
            "energy",
            "water",
            "pool",
            "supplies",
            "other",
          ]),
          standard: z.number().min(0),
          actual: z.number().min(0).nullable(),
        }),
      ),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Montos inválidos." };
  await withDb({ kind: "user", userId: user.id }, async (sql) => {
    for (const r of parsed.data.rows) {
      await sql(
        `insert into event_costs (booking_id, category, standard_amount, actual_amount) values ($1, $2, $3, $4)
         on conflict (booking_id, category) do update set standard_amount = excluded.standard_amount, actual_amount = excluded.actual_amount`,
        [parsed.data.bookingId, r.category, r.standard, r.actual],
      );
    }
  });
  refresh();
  return { ok: true };
}
