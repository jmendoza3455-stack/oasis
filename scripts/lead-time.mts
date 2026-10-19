// Anticipación de compra por segmento → horizonte recomendado del calendario público.
// Fuente primaria (preferida): el historial de la operación anterior del local, en CSV con
//   fecha_consulta, fecha_evento, tipo      (dd/mm/aaaa o aaaa-mm-dd; tipo libre: boda, empresa…)
//   pnpm analisis:anticipacion historial.csv
// Con datos ya captados por la web/CRM (leads con fecha de evento):
//   pnpm analisis:anticipacion --db        (usa DATABASE_URL)
import { readFileSync } from "node:fs";
import pg from "pg";
import { csvRecords, parseFlexibleDate } from "../lib/domain/csv.ts";
import { leadTimeStats, recommendedHorizonMonths, type LeadTimeRow } from "../lib/domain/kpis.ts";

const SEGMENT: [RegExp, string][] = [
  [/boda|matrimonio|social|quince|aniversario|cumple/i, "wedding/social"],
  [/empresa|corporat|team|offsite|cierre/i, "corporate"],
  [/full ?day|familia|piscina|family/i, "family_day"],
];
const segmentOf = (tipo: string) =>
  SEGMENT.find(([re]) => re.test(tipo))?.[1] ?? (tipo || "sin tipo");

async function fromDb(): Promise<LeadTimeRow[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ segment: string; inquiry: string; event: string }>(
      `select event_type::text as segment, to_char((created_at at time zone 'America/Lima')::date, 'YYYY-MM-DD') as inquiry,
              to_char(event_date, 'YYYY-MM-DD') as event
         from leads where event_date is not null`,
    );
    return rows;
  } finally {
    await client.end();
  }
}

function fromCsv(file: string): LeadTimeRow[] {
  const out: LeadTimeRow[] = [];
  for (const r of csvRecords(readFileSync(file, "utf8"))) {
    const inquiry = parseFlexibleDate(r.fecha_consulta ?? r.fecha_de_consulta ?? "");
    const event = parseFlexibleDate(r.fecha_evento ?? r.fecha_del_evento ?? "");
    if (inquiry && event)
      out.push({ segment: segmentOf(r.tipo ?? r.segmento ?? ""), inquiry, event });
  }
  return out;
}

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: pnpm analisis:anticipacion <historial.csv> | --db");
  process.exit(1);
}
const rows = arg === "--db" ? await fromDb() : fromCsv(arg);
const stats = leadTimeStats(rows);
console.log(`Registros válidos: ${rows.length}\n`);
console.log("| Segmento | n | Mediana (días) | p80 | p95 |");
console.log("|---|---|---|---|---|");
for (const s of stats) console.log(`| ${s.segment} | ${s.n} | ${s.p50} | ${s.p80} | ${s.p95} |`);
const small = stats.filter((s) => s.n < 20).map((s) => s.segment);
console.log(
  `\nHorizonte recomendado: ${recommendedHorizonMonths(stats)} meses (p95 del segmento más anticipado + 1).`,
);
if (small.length)
  console.log(
    `Ojo: menos de 20 registros en ${small.join(", ")}; el percentil 95 no es confiable.`,
  );
