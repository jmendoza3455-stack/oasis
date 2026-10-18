import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { toCsv } from "@/lib/domain";

type Col = { key: string; label: string };
const EXPORTS: Record<string, { sql: string; columns: Col[] }> = {
  reservas: {
    sql: `select upper(substr(b.id::text,1,8)) as codigo, to_char(b.event_date,'DD/MM/YYYY') as fecha, b.status as estado,
                 b.event_type as tipo, b.channel as canal, p.business_name as planner, c.full_name as cliente, b.guests as invitados,
                 b.rental_net::float8 as alquiler_sin_igv, b.rental_igv::float8 as igv, b.rental_gross::float8 as total_con_igv,
                 public.booking_paid(b.id)::float8 as cobrado
            from bookings b left join clients c on c.id = b.client_id left join planners p on p.id = b.planner_id
           order by b.event_date`,
    columns: [
      { key: "codigo", label: "Código" },
      { key: "fecha", label: "Fecha" },
      { key: "estado", label: "Estado" },
      { key: "tipo", label: "Tipo" },
      { key: "canal", label: "Canal" },
      { key: "planner", label: "Planner" },
      { key: "cliente", label: "Cliente" },
      { key: "invitados", label: "Invitados" },
      { key: "alquiler_sin_igv", label: "Alquiler sin IGV" },
      { key: "igv", label: "IGV" },
      { key: "total_con_igv", label: "Total con IGV" },
      { key: "cobrado", label: "Cobrado" },
    ],
  },
  leads: {
    sql: `select to_char(l.created_at at time zone 'America/Lima','DD/MM/YYYY HH24:MI') as ingreso, l.stage as etapa, l.channel as canal,
                 c.full_name as cliente, c.phone as telefono, c.email as correo, l.event_type as tipo,
                 to_char(l.event_date,'DD/MM/YYYY') as fecha_evento, l.utm_source, l.utm_medium, l.utm_campaign, l.gclid, l.fbclid,
                 l.lost_reason as motivo_perdida
            from leads l left join clients c on c.id = l.client_id order by l.created_at desc`,
    columns: [
      { key: "ingreso", label: "Ingreso" },
      { key: "etapa", label: "Etapa" },
      { key: "canal", label: "Canal" },
      { key: "cliente", label: "Cliente" },
      { key: "telefono", label: "Teléfono" },
      { key: "correo", label: "Correo" },
      { key: "tipo", label: "Tipo" },
      { key: "fecha_evento", label: "Fecha evento" },
      { key: "utm_source", label: "utm_source" },
      { key: "utm_medium", label: "utm_medium" },
      { key: "utm_campaign", label: "utm_campaign" },
      { key: "gclid", label: "gclid" },
      { key: "fbclid", label: "fbclid" },
      { key: "motivo_perdida", label: "Motivo de pérdida" },
    ],
  },
  pagos: {
    sql: `select to_char(p.paid_on,'DD/MM/YYYY') as fecha, upper(substr(p.booking_id::text,1,8)) as reserva, p.kind as concepto,
                 p.method as medio, p.operation_code as operacion, p.amount::float8 as monto, p.status as estado
            from payments p order by p.paid_on`,
    columns: [
      { key: "fecha", label: "Fecha" },
      { key: "reserva", label: "Reserva" },
      { key: "concepto", label: "Concepto" },
      { key: "medio", label: "Medio" },
      { key: "operacion", label: "N.º operación" },
      { key: "monto", label: "Monto" },
      { key: "estado", label: "Estado" },
    ],
  },
  comisiones: {
    sql: `select pl.business_name as planner, to_char(b.event_date,'DD/MM/YYYY') as fecha_evento, upper(substr(b.id::text,1,8)) as reserva,
                 cm.base_net::float8 as base_sin_igv, cm.rate::float8 as tasa, cm.amount::float8 as comision, cm.status as estado,
                 to_char(cm.payable_on,'DD/MM/YYYY') as pagable_desde, cm.payment_reference as referencia_pago
            from commissions cm join bookings b on b.id = cm.booking_id join planners pl on pl.id = cm.planner_id
           where ($1::uuid is null or cm.planner_id = $1) order by pl.business_name, b.event_date`,
    columns: [
      { key: "planner", label: "Planner" },
      { key: "fecha_evento", label: "Fecha evento" },
      { key: "reserva", label: "Reserva" },
      { key: "base_sin_igv", label: "Base sin IGV" },
      { key: "tasa", label: "Tasa" },
      { key: "comision", label: "Comisión" },
      { key: "estado", label: "Estado" },
      { key: "pagable_desde", label: "Pagable desde" },
      { key: "referencia_pago", label: "Referencia de pago" },
    ],
  },
};

export async function GET(request: NextRequest, ctx: RouteContext<"/admin/exportar/[entity]">) {
  const user = await requireStaff();
  const { entity } = await ctx.params;
  const def = EXPORTS[entity];
  if (!def) return new NextResponse("No encontrado", { status: 404 });
  const planner = request.nextUrl.searchParams.get("planner");
  const params =
    entity === "comisiones" ? [planner && /^[0-9a-f-]{36}$/.test(planner) ? planner : null] : [];
  const rows = await withDb({ kind: "user", userId: user.id }, (sql) => sql(def.sql, params));
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" })
    .format(new Date())
    .replaceAll("-", "")
    .slice(2);
  const name = `${stamp} ${entity}`;

  if (request.nextUrl.searchParams.get("format") === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(entity);
    ws.columns = def.columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: Math.max(12, c.label.length + 4),
    }));
    ws.addRows(rows);
    ws.getRow(1).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      },
    });
  }
  return new NextResponse(toCsv(rows, def.columns), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
    },
  });
}
