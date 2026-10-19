import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/session";
import { ContractPdf } from "@/lib/pdf/documents";
import { bookingForDocument } from "@/server/queries/booking-doc";

export async function GET(_: Request, ctx: RouteContext<"/admin/reservas/[id]/contrato">) {
  const user = await requireStaff();
  const { id } = await ctx.params;
  const data = await bookingForDocument(user.id, id);
  if (!data) return new NextResponse("No encontrado", { status: 404 });
  const pdf = await renderToBuffer(
    ContractPdf({ b: data.doc, company: data.company, policy: data.policy }),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Contrato-${data.doc.code}.pdf"`,
    },
  });
}
