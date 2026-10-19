import { after, NextResponse, type NextRequest } from "next/server";
import { withDb } from "@/lib/db";
import { isBot, resolvePieceRedirect } from "@/lib/marketing/links";
import { activeVenue } from "@/server/venue";

// Link corto por pieza de marketing: redirige con su atribución y cuenta el clic (sin datos
// personales; las vistas previas de redes y bots no cuentan).
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const target = resolvePieceRedirect({
    code,
    s: request.nextUrl.searchParams.get("s"),
    to: request.nextUrl.searchParams.get("to"),
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  });
  if (!target) return NextResponse.redirect(new URL("/", request.url), 307);
  if (!isBot(request.headers.get("user-agent")))
    after(async () => {
      const venue = await activeVenue();
      await withDb({ kind: "service" }, (sql) =>
        sql(
          `insert into marketing_link_clicks (venue_id, code, network, target) values ($1, $2, $3, $4)`,
          [venue.id, target.code, target.network, target.target],
        ),
      );
    });
  return NextResponse.redirect(new URL(target.url, request.url), 307);
}
