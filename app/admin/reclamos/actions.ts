"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";

export type ComplaintResult = { ok: boolean; message: string };

/** Registra la respuesta al reclamo o queja (queda en audit_log). El envío al consumidor es por correo. */
export async function respondComplaint(
  _: ComplaintResult | null,
  formData: FormData,
): Promise<ComplaintResult> {
  const user = await requireStaff();
  const parsed = z
    .object({
      id: z.uuid(),
      response: z
        .string()
        .trim()
        .min(20, "Escribe una respuesta completa (mínimo 20 caracteres).")
        .max(5000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const rows = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql(
      `update complaints set response = $2, responded_at = now() where id = $1 and responded_at is null returning id`,
      [parsed.data.id, parsed.data.response],
    ),
  );
  refresh();
  return rows.length
    ? { ok: true, message: "Respuesta registrada." }
    : { ok: false, message: "Este reclamo ya tenía respuesta." };
}
