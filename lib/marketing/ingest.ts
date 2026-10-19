// Ingesta de fuentes crudas del equipo de marketing (lo que André o Carlos descargan en minutos):
// chats de WhatsApp exportados, Google Trends, publicaciones de la competencia y capturas de la
// Biblioteca de anuncios de Meta. Funciones puras: la CLI está en scripts/marketing.mts.

// ---------------------------------------------------------------------------
// CSV (RFC 4180: comillas dobles, comas y saltos de línea dentro de comillas)
// ---------------------------------------------------------------------------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Filas como objetos con las columnas de la cabecera (en minúsculas, sin tildes). */
export function csvRecords(text: string): Record<string, string>[] {
  const [head, ...rows] = parseCsv(text);
  if (!head) return [];
  const keys = head.map((h) => plain(h).replace(/\s+/g, "_"));
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const plain = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const toNumber = (s: string | undefined) => {
  if (!s) return null;
  const clean = s.replace(/\s/g, "").replace(/,/g, "");
  const m = clean.match(/^(\d+(?:\.\d+)?)(k|mil|m)?$/i);
  if (!m) return null;
  const mult = m[2] ? (m[2].toLowerCase() === "m" ? 1e6 : 1e3) : 1;
  return Math.round(Number(m[1]) * mult);
};

/** dd/mm/aaaa, dd/mm/aa o aaaa-mm-dd → aaaa-mm-dd. */
export function isoDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

const days = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

// ---------------------------------------------------------------------------
// WhatsApp: chats exportados ("Exportar chat" → sin archivos) de Android y iPhone
// ---------------------------------------------------------------------------
export type ChatMessage = { date: string; time: string; author: string; text: string };

// Android: "19/10/26, 14:05 - Nombre: texto" (también "2:05 p. m." y años de 4 dígitos)
const ANDROID =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),? (\d{1,2}:\d{2})(?:\s?([ap])\.?\s?m\.?)? - ([^:]+?): ([\s\S]*)$/i;
// iPhone: "[19/10/26, 14:05:33] Nombre: texto"
const IOS =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),? (\d{1,2}:\d{2})(?::\d{2})?(?:\s?([ap])\.?\s?m\.?)?\] ([^:]+?): ([\s\S]*)$/i;
// Líneas de sistema ("Los mensajes están cifrados…", "X creó el grupo"): fecha sin autor
const SYSTEM = /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},? \d{1,2}:\d{2}/;

export function parseWhatsappExport(text: string): ChatMessage[] {
  const out: ChatMessage[] = [];
  let last: ChatMessage | null = null;
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.replace(/[‎‏‪-‮]/g, "").replace(/ | /g, " ");
    const m = line.match(ANDROID) ?? line.match(IOS);
    if (m) {
      const [hh, min] = m[2].split(":").map(Number);
      let h = hh;
      if (m[3]?.toLowerCase() === "p" && h < 12) h += 12;
      if (m[3]?.toLowerCase() === "a" && h === 12) h = 0;
      last = {
        date: isoDate(m[1]) ?? m[1],
        time: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        author: m[4].trim(),
        text: m[5],
      };
      out.push(last);
    } else if (SYSTEM.test(line)) last = null;
    else if (last) last.text += `\n${line}`;
  }
  return out;
}

const MEDIA =
  /^<?(multimedia omitido|media omitted|imagen omitida|image omitted|video omitido|video omitted|audio omitido|audio omitted|sticker omitido|sticker omitted|documento omitido|document omitted)>?$/i;

/**
 * Anonimiza para poder analizar sin datos personales (Ley 29733): los autores del negocio pasan
 * a "Oasis" y los demás a "Cliente 1, 2…"; se borran celulares, correos, DNI/RUC y los nombres de
 * los autores dentro del texto.
 */
export function anonymizeChat(messages: ChatMessage[], business: string[]): ChatMessage[] {
  const isBusiness = (a: string) => business.some((b) => b.trim() && plain(a).includes(plain(b)));
  const alias = new Map<string, string>();
  for (const m of messages)
    if (!alias.has(m.author))
      alias.set(
        m.author,
        isBusiness(m.author)
          ? "Oasis"
          : `Cliente ${[...alias.values()].filter((v) => v !== "Oasis").length + 1}`,
      );
  // Nombres propios de los autores (cada palabra de 3+ letras) para borrarlos del texto
  const names = [...alias.keys()]
    .flatMap((a) => a.split(/\s+/))
    .map((w) => w.replace(/[^\p{L}]/gu, ""))
    .filter((w) => w.length >= 3);
  const nameRe = names.length
    ? new RegExp(
        `\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
        "giu",
      )
    : null;
  const scrub = (t: string) => {
    let s = t
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[correo]")
      .replace(/(?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, "[celular]")
      .replace(/\b\d{11}\b/g, "[ruc]")
      .replace(/\b\d{8}\b/g, "[dni]")
      .replace(/\b\d{7,}\b/g, "[número]");
    if (nameRe) s = s.replace(nameRe, "[nombre]");
    return MEDIA.test(s.trim()) ? "[adjunto]" : s;
  };
  return messages.map((m) => ({ ...m, author: alias.get(m.author)!, text: scrub(m.text) }));
}

/** Temas de la voz del cliente: primera codificación automática; la fina la hace una persona. */
export const VOC_TOPICS: Record<string, RegExp> = {
  precio: /precio|cu[aá]nto (cuesta|sale|est[aá])|costo|tarifa|presupuesto|cotiza/i,
  fecha: /fecha|disponib|libre|s[aá]bado|domingo|diciembre|enero|febrero|marzo/i,
  capacidad: /capacidad|personas|invitados|aforo|cu[aá]ntos (entran|caben)/i,
  ubicacion:
    /ubicaci|d[oó]nde|c[oó]mo llego|direcci|lejos|distancia|panamericana|lur[ií]n|pachac[aá]mac/i,
  piscina: /piscina|pileta/i,
  hospedaje: /dormir|hosped|habitaci|quedarnos|amanecida|pernoct/i,
  comida: /catering|comida|buffet|parrilla|bocaditos|torta/i,
  musica_horario: /m[uú]sica|dj|hora|horario|ruido|hasta qu[eé] hora/i,
  estacionamiento: /estacion|parqueo|cochera|carros/i,
  visita: /visita|conocer|ver el local|fotos|video/i,
  pago: /adelanto|separ|abono|transferencia|yape|plin|factura|boleta/i,
};

export type VocSummary = {
  chats: number;
  clientMessages: number;
  /** % de chats en los que el cliente toca cada tema. */
  topics: { topic: string; chats: number; share: number }[];
  /** Primeras frases textuales de los clientes (para el mapa de mensajes). */
  openers: string[];
};

export function vocSummary(chats: ChatMessage[][]): VocSummary {
  const count = new Map<string, number>();
  const openers: string[] = [];
  let clientMessages = 0;
  for (const chat of chats) {
    const client = chat.filter((m) => m.author !== "Oasis" && m.text !== "[adjunto]");
    clientMessages += client.length;
    const text = client.map((m) => m.text).join("\n");
    for (const [topic, re] of Object.entries(VOC_TOPICS))
      if (re.test(text)) count.set(topic, (count.get(topic) ?? 0) + 1);
    const first = client.find((m) => m.text.trim().length >= 12);
    if (first) openers.push(first.text.trim().replace(/\s+/g, " ").slice(0, 200));
  }
  return {
    chats: chats.length,
    clientMessages,
    topics: [...count.entries()]
      .map(([topic, n]) => ({ topic, chats: n, share: chats.length ? n / chats.length : 0 }))
      .sort((a, b) => b.chats - a.chats),
    openers,
  };
}

export function chatMarkdown(messages: ChatMessage[]): string {
  return messages.map((m) => `**${m.author}** (${m.date} ${m.time}): ${m.text}`).join("\n\n");
}

// ---------------------------------------------------------------------------
// Google Trends: CSV de "Interés a lo largo del tiempo" → estacionalidad mensual
// ---------------------------------------------------------------------------
export type Seasonality = {
  terms: string[];
  /** Índice por mes del año (1–12); 100 = promedio del término. */
  months: { month: number; values: Record<string, number | null> }[];
  /** Los 3 meses de mayor interés de cada término. */
  peaks: Record<string, number[]>;
};

export function trendsSeasonality(csv: string): Seasonality {
  const rows = parseCsv(csv);
  const h = rows.findIndex((r) => /^(semana|week|mes|month|d[ií]a|day)$/i.test(r[0]?.trim() ?? ""));
  if (h < 0) throw new Error("No encuentro la cabecera (Semana/Mes/Día) del CSV de Google Trends");
  const terms = rows[h].slice(1).map((t) => t.replace(/:\s*\(.*\)$/, "").trim());
  const sums = terms.map(() => Array.from({ length: 12 }, () => ({ s: 0, n: 0 })));
  for (const r of rows.slice(h + 1)) {
    const date = isoDate(r[0]) ?? (/^\d{4}-\d{2}$/.test(r[0].trim()) ? `${r[0].trim()}-01` : null);
    if (!date) continue;
    const month = Number(date.slice(5, 7)) - 1;
    terms.forEach((_, i) => {
      const cell = (r[i + 1] ?? "").trim();
      const v = cell === "<1" ? 0.5 : Number(cell);
      if (cell !== "" && Number.isFinite(v)) {
        sums[i][month].s += v;
        sums[i][month].n += 1;
      }
    });
  }
  const avg = sums.map((ms) => ms.map((m) => (m.n ? m.s / m.n : null)));
  const index = avg.map((ms) => {
    const valid = ms.filter((v): v is number => v !== null);
    const mean = valid.reduce((a, b) => a + b, 0) / (valid.length || 1);
    return ms.map((v) => (v === null || mean === 0 ? null : Math.round((100 * v) / mean)));
  });
  return {
    terms,
    months: Array.from({ length: 12 }, (_, m) => ({
      month: m + 1,
      values: Object.fromEntries(terms.map((t, i) => [t, index[i][m]])),
    })),
    peaks: Object.fromEntries(
      terms.map((t, i) => [
        t,
        index[i]
          .map((v, m) => [v ?? -1, m + 1] as const)
          .sort((a, b) => b[0] - a[0])
          .slice(0, 3)
          .map(([, m]) => m),
      ]),
    ),
  };
}

// ---------------------------------------------------------------------------
// Competencia: publicaciones registradas a mano (docs/marketing/plantillas/competencia.csv)
// ---------------------------------------------------------------------------
export type CompetitorReport = {
  rows: number;
  byCompetitor: {
    competitor: string;
    posts: number;
    medianInteractions: number | null;
    byFormat: { format: string; posts: number; medianInteractions: number | null }[];
    top: { date: string; format: string; topic: string; interactions: number; url: string }[];
  }[];
  /** Mediana de interacciones por tema entre todos los competidores. */
  byTopic: { topic: string; posts: number; medianInteractions: number | null }[];
};

export function competitorReport(csv: string): CompetitorReport {
  const posts = csvRecords(csv).map((r) => ({
    competitor: r.competidor,
    date: isoDate(r.fecha ?? "") ?? r.fecha ?? "",
    format: plain(r.formato ?? "") || "otro",
    topic: plain(r.tema ?? "") || "sin tema",
    url: r.url ?? "",
    interactions: (toNumber(r.me_gusta) ?? 0) + (toNumber(r.comentarios) ?? 0),
  }));
  const valid = posts.filter((p) => p.competitor);
  const group = <K extends string>(list: typeof valid, key: (p: (typeof valid)[number]) => K) => {
    const m = new Map<K, typeof valid>();
    for (const p of list) m.set(key(p), [...(m.get(key(p)) ?? []), p]);
    return m;
  };
  const med = (l: typeof valid) => median(l.map((p) => p.interactions));
  return {
    rows: valid.length,
    byCompetitor: [...group(valid, (p) => p.competitor)]
      .map(([competitor, list]) => ({
        competitor,
        posts: list.length,
        medianInteractions: med(list),
        byFormat: [...group(list, (p) => p.format)]
          .map(([format, l]) => ({ format, posts: l.length, medianInteractions: med(l) }))
          .sort((a, b) => (b.medianInteractions ?? 0) - (a.medianInteractions ?? 0)),
        top: [...list]
          .sort((a, b) => b.interactions - a.interactions)
          .slice(0, 3)
          .map(({ date, format, topic, interactions, url }) => ({
            date,
            format,
            topic,
            interactions,
            url,
          })),
      }))
      .sort((a, b) => (b.medianInteractions ?? 0) - (a.medianInteractions ?? 0)),
    byTopic: [...group(valid, (p) => p.topic)]
      .map(([topic, l]) => ({ topic, posts: l.length, medianInteractions: med(l) }))
      .sort((a, b) => (b.medianInteractions ?? 0) - (a.medianInteractions ?? 0)),
  };
}

// ---------------------------------------------------------------------------
// Biblioteca de anuncios de Meta: capturas registradas a mano (plantillas/anuncios.csv)
// ---------------------------------------------------------------------------
/** Un anuncio que sigue activo 21+ días probablemente rinde: nadie paga semanas por algo que no vende. */
export const AD_WINNER_DAYS = 21;

export type AdsReport = {
  rows: number;
  byAdvertiser: {
    advertiser: string;
    ads: number;
    active: number;
    winners: number;
    formats: Record<string, number>;
    ctas: Record<string, number>;
  }[];
  winners: { advertiser: string; days: number; format: string; cta: string; text: string }[];
};

export function adsReport(csv: string, today: string): AdsReport {
  const ads = csvRecords(csv)
    .filter((r) => r.anunciante && isoDate(r.inicio ?? ""))
    .map((r) => {
      const start = isoDate(r.inicio)!;
      const end = isoDate(r.fin ?? "") ?? today;
      return {
        advertiser: r.anunciante,
        days: days(start, end) + 1,
        active: /^(si|sí|s|1|true|activo)$/i.test(r.activo ?? "") || !isoDate(r.fin ?? ""),
        format: plain(r.formato ?? "") || "otro",
        cta: r.cta || "—",
        text: (r.texto ?? "").replace(/\s+/g, " ").slice(0, 240),
      };
    });
  const tally = (list: string[]) =>
    list.reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {});
  const advertisers = [...new Set(ads.map((a) => a.advertiser))];
  return {
    rows: ads.length,
    byAdvertiser: advertisers
      .map((advertiser) => {
        const list = ads.filter((a) => a.advertiser === advertiser);
        return {
          advertiser,
          ads: list.length,
          active: list.filter((a) => a.active).length,
          winners: list.filter((a) => a.days >= AD_WINNER_DAYS).length,
          formats: tally(list.map((a) => a.format)),
          ctas: tally(list.map((a) => a.cta)),
        };
      })
      .sort((a, b) => b.winners - a.winners || b.ads - a.ads),
    winners: ads
      .filter((a) => a.days >= AD_WINNER_DAYS)
      .sort((a, b) => b.days - a.days)
      .map(({ advertiser, days: d, format, cta, text }) => ({
        advertiser,
        days: d,
        format,
        cta,
        text,
      })),
  };
}
