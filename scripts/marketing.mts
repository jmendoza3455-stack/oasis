// Herramienta del equipo de marketing (agentes editor, diseñador y director creativo;
// ver agents/README.md y docs/261019 Equipo de marketing.md).
//
//   pnpm marketing snapshot                 # contexto en JSON: piezas, comentarios, resultados, clips, fechas por llenar
//   pnpm marketing fetch <carpeta> [--days 14]   # descarga los clips recientes (para editar)
//   pnpm marketing submit <pieza.json>      # sube los archivos y deja la pieza "en revisión"
//
// Fuentes crudas (archivos que André o Carlos descargan; ver docs/marketing/plantillas):
//   pnpm marketing voc <chat.txt|carpeta>... --negocio "Carlos,Oasis" [--out out/voc]
//                                           # chats de WhatsApp anonimizados + temas de la voz del cliente
//   pnpm marketing trends <trends.csv>      # estacionalidad mensual de Google Trends
//   pnpm marketing competencia <competencia.csv>   # qué formatos y temas rinden a la competencia
//   pnpm marketing anuncios <anuncios.csv> [--hoy aaaa-mm-dd]   # anuncios activos 21+ días
//
// Conexión a la BD: DATABASE_URL o SUPABASE_PROJECT_REF (Management API, como scripts/agent.mts).
// Archivos: bucket "marketing" con NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; sin ellas,
// .storage/marketing/ (modo local). Los agentes nunca publican: solo André aprueba y publica.
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { z } from "zod";
import {
  adsReport,
  anonymizeChat,
  chatMarkdown,
  competitorReport,
  parseWhatsappExport,
  trendsSeasonality,
  vocSummary,
} from "../lib/marketing/ingest.ts";
import { calibration, hookTests, performance } from "../lib/marketing/stats.ts";

const root = path.resolve(import.meta.dirname, "..");
const [cmd, ...rest] = process.argv.slice(2);
const slug = process.env.OASIS_VENUE_SLUG ?? "oasis-pachacamac";
const lit = (v: unknown) =>
  v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`;

async function query<T>(sql: string): Promise<T[]> {
  if (process.env.DATABASE_URL) {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const res = await client.query(sql);
      const last = Array.isArray(res) ? res[res.length - 1] : res;
      return last.rows as T[];
    } finally {
      await client.end();
    }
  }
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!ref) throw new Error("Falta DATABASE_URL o SUPABASE_PROJECT_REF");
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
  return body ? (JSON.parse(body) as T[]) : [];
}
const json = async (sql: string) =>
  (await query<{ j: unknown }>(`select coalesce(json_agg(t), '[]') as j from (${sql}) t`))[0].j;

// ---------------------------------------------------------------------------
// Archivos: Supabase Storage o .storage/ local
// ---------------------------------------------------------------------------
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const remote = Boolean(SUPA && KEY);
const localPath = (key: string) => path.join(root, ".storage", "marketing", key);

async function download(key: string, dest: string) {
  if (!remote) return copyFile(localPath(key), dest);
  const res = await fetch(`${SUPA}/storage/v1/object/marketing/${key}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`No se pudo descargar ${key}: HTTP ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function upload(file: string, key: string, contentType: string) {
  const bytes = await readFile(file);
  if (!remote) {
    await mkdir(path.dirname(localPath(key)), { recursive: true });
    return writeFile(localPath(key), bytes);
  }
  const res = await fetch(`${SUPA}/storage/v1/object/marketing/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "content-type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`No se pudo subir ${key}: HTTP ${res.status} ${await res.text()}`);
}

const TYPE: Record<string, string> = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// ---------------------------------------------------------------------------
const venue = `(select id from venues where slug = ${lit(slug)})`;
const today = `(now() at time zone 'America/Lima')::date`;

if (cmd === "snapshot") {
  const months = [0, 1, 2, 3, 4, 5].map(
    (i) => `date_trunc('month', ${today} + interval '${i} month')::date`,
  );
  const history = (await json(
    `select code, status, (review->>'score')::int as score, first_decision as "firstDecision", metrics
       from marketing_pieces where venue_id = ${venue} and status <> 'draft'`,
  )) as {
    code: string;
    status: string;
    score: number | null;
    firstDecision: string | null;
    metrics: Record<string, unknown>;
  }[];
  const snapshot = {
    generated_at: new Date().toISOString(),
    settings: await json(
      `select key, value from settings where venue_id = ${venue}
         and key in ('reopening_date','capacity','public_prices_enabled','hold_hours','deposit_pct','planner_commission_rate','planner_protection_days','social_links','venue_address')`,
    ),
    // Qué hay que llenar: sábados y domingos libres por mes (los próximos 6 meses)
    free_weekends: await json(
      months
        .map(
          (m) => `select to_char(${m}, 'YYYY-MM') as month,
                  count(*) filter (where extract(isodow from day) = 6 and status = 'free')::int as free_saturdays,
                  count(*) filter (where extract(isodow from day) = 6)::int as saturdays,
                  count(*) filter (where extract(isodow from day) = 7 and status = 'free')::int as free_sundays,
                  count(*) filter (where extract(isodow from day) between 1 and 4 and status = 'free')::int as free_weekdays
             from public.public_availability(${lit(slug)}, greatest(${m}, ${today}), (${m} + interval '1 month - 1 day')::date)`,
        )
        .join(" union all "),
    ),
    demand_by_segment_30d: await json(
      `select event_type::text as segment, count(*)::int as leads from leads
        where venue_id = ${venue} and created_at > now() - interval '30 days' group by 1 order by 2 desc`,
    ),
    leads_by_source_30d: await json(
      `select coalesce(utm_source, '(directo)') as source, count(*)::int as leads from leads
        where venue_id = ${venue} and created_at > now() - interval '30 days' group by 1 order by 2 desc`,
    ),
    pieces_open: await json(
      `select code, version, kind, title, pillar, status, feedback, review->>'score' as director_score,
              qa->>'score' as qa_score, created_by_agent, to_char(created_at, 'YYYY-MM-DD') as created
         from marketing_pieces where venue_id = ${venue} and status in ('draft','review','changes','approved')
        order by created_at desc`,
    ),
    // Aprendizaje: resultados de lo publicado (guardados y compartidos por cada 1,000 de alcance)
    published_results: await json(
      `select code, version, kind, title, pillar, to_char(published_at, 'YYYY-MM-DD') as published,
              metrics, spec->'overlays'->0->>'text' as hook,
              round(1000.0 * (coalesce((metrics->>'saves')::int,0) + coalesce((metrics->>'shares')::int,0))
                    / nullif((metrics->>'reach')::int, 0), 1) as saves_shares_per_1k
         from marketing_pieces where venue_id = ${venue} and status = 'published'
        order by published_at desc limit 30`,
    ),
    // Atribución por pieza (links /r/<código> y código pieza-<código> en WhatsApp)
    attribution: await json(
      `select code, web_clicks, whatsapp_clicks, leads, bookings from marketing_attribution
        where venue_id = ${venue} and (web_clicks + whatsapp_clicks + leads) > 0 order by bookings desc, leads desc`,
    ),
    // Laboratorio: pruebas de gancho (r07 vs r07b) y calibración del director creativo
    hook_tests: hookTests(history.filter((h) => h.status === "published")),
    director_calibration: calibration(
      history.map((h) => ({
        score: h.score,
        firstDecision: h.firstDecision,
        perf: h.status === "published" ? performance(h.metrics) : null,
      })),
    ),
    // Plan de la semana y aprendizajes que dejaron Contenido y Growth (y los pedidos de tomas)
    team_notes: await json(
      `select agent, kind, title, body, status, to_char(created_at, 'YYYY-MM-DD') as created
         from agent_proposals where venue_id = ${venue}
          and agent in ('contenido', 'growth', 'editor', 'disenador') and kind in ('content', 'aprendizaje')
        order by created_at desc limit 12`,
    ),
    clips: await json(
      `select storage_key as key, filename, notes, round(size_bytes / 1048576.0, 1) as mb,
              to_char(created_at, 'YYYY-MM-DD') as uploaded
         from marketing_clips where venue_id = ${venue} order by created_at desc limit 80`,
    ),
  };
  console.log(JSON.stringify(snapshot, null, 2));
} else if (cmd === "fetch") {
  const dir = path.resolve(rest[0] ?? "clips");
  const days = Number(rest[rest.indexOf("--days") + 1]) || 14;
  await mkdir(dir, { recursive: true });
  const clips = await query<{ key: string }>(
    `select storage_key as key from marketing_clips where venue_id = ${venue}
      and created_at > now() - interval '${Math.min(365, Math.max(1, days))} days' order by created_at`,
  );
  for (const c of clips) {
    await download(c.key, path.join(dir, path.basename(c.key)));
    console.log(`✓ ${path.basename(c.key)}`);
  }
  console.log(`${clips.length} clips en ${dir} (${remote ? "Supabase" : "local"})`);
} else if (cmd === "submit") {
  const pieceSchema = z.object({
    code: z
      .string()
      .regex(
        /^[a-z]{1,3}\d{2,3}b?$/,
        "código tipo r01, c03, h12, g05 (variante B de una prueba: r01b)",
      ),
    kind: z.enum(["reel", "carousel", "story", "gbp_post"]),
    title: z.string().min(3).max(140),
    pillar: z.string().max(60).optional(),
    caption: z.string().max(2200),
    hashtags: z.string().max(500).optional(),
    networks: z.array(z.enum(["instagram", "tiktok", "facebook", "google"])).optional(),
    agent: z.enum(["editor", "disenador", "contenido"]),
    spec: z.unknown().optional(),
    qa: z.object({ score: z.number(), ok: z.boolean(), checks: z.array(z.unknown()) }).optional(),
    review: z.object({
      score: z.number().min(0).max(100),
      verdict: z.enum(["aprobar", "rehacer"]),
      notes: z.array(z.string()).max(8),
    }),
    files: z.object({
      video: z.string().optional(),
      cover: z.string().optional(),
      images: z.array(z.string()).max(10).default([]),
    }),
  });
  const file = path.resolve(rest[0] ?? "");
  const piece = pieceSchema.parse(JSON.parse(await readFile(file, "utf8")));
  // Puerta de calidad: el director creativo no deja pasar piezas bajo 80 ni con errores técnicos
  if (piece.review.verdict !== "aprobar" || piece.review.score < 80)
    throw new Error(
      `El director creativo no aprobó la pieza (${piece.review.score}/100): rehacer antes de enviar.`,
    );
  if (piece.qa && !piece.qa.ok)
    throw new Error("El control técnico tiene errores: corregir antes de enviar.");
  const [{ v }] = await query<{ v: number }>(
    `select coalesce(max(version), 0)::int + 1 as v from marketing_pieces where venue_id = ${venue} and code = ${lit(piece.code)}`,
  );
  const base = path.dirname(file);
  const put = async (rel: string | undefined, name: string) => {
    if (!rel) return null;
    const src = path.resolve(base, rel);
    const ext = path.extname(src).toLowerCase();
    const key = `pieces/${piece.code}/v${v}/${name}${ext}`;
    await upload(src, key, TYPE[ext] ?? "application/octet-stream");
    return key;
  };
  const video = await put(piece.files.video, "video");
  const cover = await put(piece.files.cover, "portada");
  const images: string[] = [];
  for (const [i, img] of piece.files.images.entries())
    images.push((await put(img, `lamina-${i + 1}`))!);
  // La versión anterior que estaba "en cambios" queda reemplazada
  await query(
    `update marketing_pieces set status = 'discarded' where venue_id = ${venue} and code = ${lit(piece.code)} and status = 'changes'`,
  );
  await query(
    `insert into marketing_pieces (venue_id, code, version, kind, title, pillar, status, spec, caption, hashtags,
                                   networks, video_key, cover_key, image_keys, qa, review, created_by_agent)
     values (${venue}, ${lit(piece.code)}, ${v}, ${lit(piece.kind)}, ${lit(piece.title)}, ${lit(piece.pillar)}, 'review',
             ${piece.spec ? `${lit(JSON.stringify(piece.spec))}::jsonb` : "null"}, ${lit(piece.caption)}, ${lit(piece.hashtags)},
             array[${(piece.networks ?? ["instagram", "tiktok", "facebook"]).map(lit).join(",")}]::text[],
             ${lit(video)}, ${lit(cover)}, array[${images.map(lit).join(",")}]::text[],
             ${piece.qa ? `${lit(JSON.stringify(piece.qa))}::jsonb` : "null"}, ${lit(JSON.stringify(piece.review))}::jsonb, ${lit(piece.agent)})`,
  );
  console.log(
    `✓ ${piece.code} v${v} en revisión (${remote ? "Supabase" : "local"}) → /admin/marketing`,
  );
} else if (cmd === "voc") {
  const flag = (name: string) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : undefined);
  const business = (flag("--negocio") ?? "").split(",").filter(Boolean);
  if (!business.length)
    throw new Error('Indica quién responde por el negocio: --negocio "Carlos,Oasis Pachacámac"');
  const outDir = path.resolve(flag("--out") ?? path.join(root, "out", "voc"));
  const inputs = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));
  const files: string[] = [];
  for (const input of inputs) {
    const p = path.resolve(input);
    if ((await stat(p)).isDirectory())
      files.push(
        ...(await readdir(p)).filter((f) => f.endsWith(".txt")).map((f) => path.join(p, f)),
      );
    else files.push(p);
  }
  await mkdir(outDir, { recursive: true });
  const chats = [];
  for (const [i, f] of files.sort().entries()) {
    const chat = anonymizeChat(parseWhatsappExport(await readFile(f, "utf8")), business);
    if (!chat.length) continue;
    chats.push(chat);
    // Nombre neutro: el archivo original suele llevar el nombre del cliente
    await writeFile(
      path.join(outDir, `chat-${String(i + 1).padStart(3, "0")}.md`),
      chatMarkdown(chat),
    );
  }
  const s = vocSummary(chats);
  const md = [
    `# Voz del cliente: primera lectura automática (${s.chats} chats, ${s.clientMessages} mensajes de clientes)`,
    "",
    "Codificación por palabras clave; la fina la hace una persona con docs/marketing/plantillas/mapa-de-mensajes.csv.",
    "",
    "| Tema | Chats | % |",
    "| --- | ---: | ---: |",
    ...s.topics.map((t) => `| ${t.topic} | ${t.chats} | ${Math.round(t.share * 100)} % |`),
    "",
    "## Primeras frases de los clientes (textuales, anonimizadas)",
    "",
    ...s.openers.map((o) => `- "${o}"`),
  ].join("\n");
  await writeFile(path.join(outDir, "resumen.md"), md);
  console.log(md);
  console.log(`\n${chats.length} chats anonimizados en ${outDir} (no se suben al repositorio).`);
} else if (cmd === "trends") {
  const s = trendsSeasonality(await readFile(path.resolve(rest[0] ?? ""), "utf8"));
  const MONTHS = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "set",
    "oct",
    "nov",
    "dic",
  ];
  console.log(
    [
      "Índice mensual de búsquedas en Google (100 = promedio del término)",
      "",
      `| Mes | ${s.terms.join(" | ")} |`,
      `| --- | ${s.terms.map(() => "---:").join(" | ")} |`,
      ...s.months.map(
        (m) => `| ${MONTHS[m.month - 1]} | ${s.terms.map((t) => m.values[t] ?? "—").join(" | ")} |`,
      ),
      "",
      ...s.terms.map((t) => `Picos de "${t}": ${s.peaks[t].map((m) => MONTHS[m - 1]).join(", ")}`),
    ].join("\n"),
  );
} else if (cmd === "competencia") {
  const r = competitorReport(await readFile(path.resolve(rest[0] ?? ""), "utf8"));
  const lines = [`${r.rows} publicaciones registradas`, ""];
  for (const c of r.byCompetitor) {
    lines.push(
      `## ${c.competitor}: ${c.posts} publicaciones, mediana ${c.medianInteractions ?? "—"} interacciones`,
      ...c.byFormat.map(
        (f) => `- ${f.format}: ${f.posts} (mediana ${f.medianInteractions ?? "—"})`,
      ),
      ...c.top.map(
        (t) => `  - Top: ${t.date} ${t.format} "${t.topic}" ${t.interactions} → ${t.url}`,
      ),
      "",
    );
  }
  lines.push(
    "## Por tema (todos los competidores)",
    ...r.byTopic.map((t) => `- ${t.topic}: ${t.posts} (mediana ${t.medianInteractions ?? "—"})`),
  );
  console.log(lines.join("\n"));
} else if (cmd === "anuncios") {
  const hoy = rest.includes("--hoy")
    ? rest[rest.indexOf("--hoy") + 1]
    : new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const r = adsReport(await readFile(path.resolve(rest[0] ?? ""), "utf8"), hoy);
  console.log(
    [
      `${r.rows} anuncios registrados (al ${hoy})`,
      "",
      "| Anunciante | Anuncios | Activos | 21+ días |",
      "| --- | ---: | ---: | ---: |",
      ...r.byAdvertiser.map((a) => `| ${a.advertiser} | ${a.ads} | ${a.active} | ${a.winners} |`),
      "",
      "## Los que probablemente rinden (activos 21 días o más)",
      ...r.winners.map(
        (w) => `- ${w.advertiser} · ${w.days} días · ${w.format} · ${w.cta}: "${w.text}"`,
      ),
    ].join("\n"),
  );
} else {
  console.error(
    "Uso: pnpm marketing snapshot | fetch <carpeta> | submit <pieza.json> | voc <chats> --negocio <nombres> | trends <csv> | competencia <csv> | anuncios <csv>",
  );
  process.exit(1);
}
