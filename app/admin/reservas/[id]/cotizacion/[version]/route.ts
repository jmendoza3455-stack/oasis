import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { QuotePdf } from "@/lib/pdf/documents";
import { bookingForDocument } from "@/server/queries/booking-doc";

export async function GET(
  _: Request,
  ctx: RouteContext<"/admin/reservas/[id]/cotizacion/[version]">,
) {
  const user = await requireStaff();
  const { id, version } = await ctx.params;
  const data = await bookingForDocument(user.id, id);
  const [q] = await withDb({ kind: "user", userId: user.id }, (sql) =>
    sql<{ version: number; validUntil: string | null }>(
      `select version, to_char(valid_until, 'YYYY-MM-DD') as "validUntil" from quotes where booking_id = $1 and version = $2`,
      [id, Number(version)],
    ),
  );
  if (!data || !q) return new NextResponse("No encontrado", { status: 404 });
  const pdf = await renderToBuffer(
    QuotePdf({ b: data.doc, company: data.company, version: q.version, validUntil: q.validUntil }),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Cotizacion-${data.doc.code}-v${q.version}.pdf"`,
    },
  });
}
