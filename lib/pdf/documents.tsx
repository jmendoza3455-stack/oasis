import "server-only";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatPEN } from "@/lib/domain";

const GREEN = "#374031";
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#333333", lineHeight: 1.4 },
  brand: { fontSize: 18, letterSpacing: 4, color: GREEN, fontFamily: "Times-Roman" },
  legal: { fontSize: 9, color: "#6F6F6F", marginBottom: 18 },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GREEN, marginBottom: 8 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GREEN, marginTop: 12, marginBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: "0.5pt solid #E2DCCF",
  },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#6F6F6F", fontSize: 8 },
  draft: { fontSize: 8, color: "#C2683F", marginBottom: 10 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: "#6F6F6F" },
});

/** Empresa operadora (razón social de Configuración): dato legal, no marca. */
export type DocCompany = { legalName: string; ruc: string; address: string };

export type DocBooking = {
  code: string;
  eventDate: string;
  eventLabel: string;
  guests: number;
  overnight: boolean;
  client: { name: string; document: string | null; email: string | null; phone: string | null };
  listNet: number;
  discountPct: number;
  net: number;
  igv: number;
  gross: number;
  igvRate: number;
  deposit: number;
  balanceDueOn: string | null;
  guarantee: number;
  slotLabel: string;
};

function Header({ company }: { company: DocCompany }) {
  return (
    <View>
      <Text style={s.brand}>OASIS PACHACÁMAC</Text>
      <Text style={s.legal}>
        {company.legalName} · RUC {company.ruc}
      </Text>
    </View>
  );
}

function Amounts({ b }: { b: DocBooking }) {
  const line = (label: string, value: string, bold = false) => (
    <View style={s.row}>
      <Text style={bold ? s.bold : undefined}>{label}</Text>
      <Text style={bold ? s.bold : undefined}>{value}</Text>
    </View>
  );
  return (
    <View>
      {line("Alquiler exclusivo del local (sin IGV)", formatPEN(b.listNet))}
      {b.discountPct > 0 &&
        line(`Descuento ${b.discountPct} %`, `- ${formatPEN(b.listNet - b.net)}`)}
      {line("Subtotal sin IGV", formatPEN(b.net))}
      {line(`IGV ${Math.round(b.igvRate * 100)} %`, formatPEN(b.igv))}
      {line("Total con IGV", formatPEN(b.gross), true)}
      {line("Adelanto para separar la fecha", formatPEN(b.deposit))}
      {line(
        "Saldo",
        `${formatPEN(b.gross - b.deposit)}${b.balanceDueOn ? ` · hasta el ${formatDate(b.balanceDueOn)}` : ""}`,
      )}
      {line("Garantía reembolsable (aparte)", formatPEN(b.guarantee))}
    </View>
  );
}

export function QuotePdf({
  b,
  company,
  version,
  validUntil,
}: {
  b: DocBooking;
  company: DocCompany;
  version: number;
  validUntil: string | null;
}) {
  return (
    <Document title={`Cotización ${b.code} v${version}`} author="Oasis Pachacámac">
      <Page size="A4" style={s.page}>
        <Header company={company} />
        <Text style={s.h1}>
          Cotización N.º {b.code}-v{version}
        </Text>
        <Text>Cliente: {b.client.name}</Text>
        <Text>
          Evento: {b.eventLabel} · {formatDate(b.eventDate)} · {b.slotLabel} · {b.guests} invitados
          {b.overnight ? " · con pernocte" : ""}
        </Text>
        {validUntil && (
          <Text style={s.muted}>
            Válida hasta el {formatDate(validUntil)}. Sujeta a disponibilidad.
          </Text>
        )}
        <Text style={s.h2}>Detalle</Text>
        <Amounts b={b} />
        <Text style={s.h2}>Incluye</Text>
        <Text>
          Uso exclusivo de jardín, terraza, piscina y zona de parrilla en el horario contratado.
          Proveedores externos permitidos según el reglamento de uso.
        </Text>
        <Text style={s.footer}>
          Comprobante electrónico emitido por {company.legalName}. Montos en soles (S/).
        </Text>
      </Page>
    </Document>
  );
}

export function ContractPdf({
  b,
  company,
  policy,
}: {
  b: DocBooking;
  company: DocCompany;
  policy: { earlyDays: number; earlyPct: number; reschedDays: number };
}) {
  return (
    <Document title={`Contrato ${b.code}`} author="Oasis Pachacámac">
      <Page size="A4" style={s.page}>
        <Header company={company} />
        <Text style={s.draft}>
          BORRADOR · Texto pendiente de revisión legal antes de su uso (OASIS.md §11.7).
        </Text>
        <Text style={s.h1}>Contrato de alquiler de local para evento N.º {b.code}</Text>
        <Text>
          De una parte, {company.legalName}, con RUC {company.ruc} y domicilio en {company.address}{" "}
          («EL OPERADOR»), y de la otra, {b.client.name}
          {b.client.document ? `, con documento ${b.client.document}` : ""} («EL CLIENTE»),
          acuerdan:
        </Text>
        <Text style={s.h2}>1. Objeto</Text>
        <Text>
          EL OPERADOR cede a EL CLIENTE el uso exclusivo del local Oasis Pachacámac (Pachacámac,
          Lima) el {formatDate(b.eventDate)}, franja {b.slotLabel}
          {b.overnight ? ", con pernocte" : ""}, para un evento de tipo {b.eventLabel.toLowerCase()}{" "}
          con un máximo de {b.guests} invitados.
        </Text>
        <Text style={s.h2}>2. Precio y forma de pago</Text>
        <Amounts b={b} />
        <Text style={s.h2}>3. Garantía</Text>
        <Text>
          La garantía se paga antes del evento y se devuelve después de la recepción del local,
          descontando daños o incumplimientos del reglamento debidamente sustentados.
        </Text>
        <Text style={s.h2}>4. Cancelación y reprogramación</Text>
        <Text>
          Si EL CLIENTE cancela con más de {policy.earlyDays} días de anticipación, se devuelve el{" "}
          {Math.round(policy.earlyPct * 100)} % del adelanto; con menos anticipación no hay
          devolución. Se permite una reprogramación sin costo solicitada con al menos{" "}
          {policy.reschedDays} días de anticipación, sujeta a disponibilidad.
        </Text>
        <Text style={s.h2}>5. Reglamento de uso</Text>
        <Text>
          EL CLIENTE y sus proveedores cumplen el reglamento de uso (horario, música y ruido, aforo,
          piscina y seguridad, limpieza), que forma parte de este contrato.
        </Text>
        <Text style={s.h2}>6. Datos personales</Text>
        <Text>
          Los datos de EL CLIENTE se tratan conforme a la Ley N.º 29733 y al aviso de privacidad
          publicado en la web.
        </Text>
        <Text style={{ marginTop: 40 }}>
          ______________________________ ______________________________
        </Text>
        <Text>EL OPERADOR EL CLIENTE</Text>
        <Text style={s.footer}>
          Contrato generado desde la reserva {b.code}. Montos en soles (S/).
        </Text>
      </Page>
    </Document>
  );
}
