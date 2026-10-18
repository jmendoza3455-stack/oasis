import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { withDb } from "@/lib/db";
import {
  estimateRange,
  formatDate,
  formatPEN,
  PricingError,
  runCost,
  withinBudget,
  type ChatMessage,
  type EventType,
  type TokenPricing,
} from "@/lib/domain";
import { FAQ, SEGMENTS } from "@/lib/content/segments";
import { leadRef, verifyLeadRef } from "@/lib/lead-ref";
import type { NewLead } from "@/server/public/leads";
import { alertStaff } from "@/server/automations";
import { createLead } from "@/server/public/leads";
import { loadPricingContext } from "@/server/pricing-context";
import { activeVenue, type Venue } from "@/server/venue";

// Recepcionista (docs/agentes.md #1): responde la web 24/7, califica, consulta disponibilidad,
// da el rango del cotizador y registra el lead. Nunca negocia precios ni confirma reservas.
// Corre como actor "agent" y queda en audit_log. Tope de gasto mensual en settings.

const AGENT = "recepcionista";
const ACTOR = { kind: "service", actorType: "agent", actorName: AGENT } as const;
const MAX_TOOL_ROUNDS = 4;

type Provider = {
  create(
    params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  ): Promise<Anthropic.Messages.Message>;
};

export function recepcionistaEnabled(): boolean {
  return fakeMode() || Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL);
}
const fakeMode = () => process.env.OASIS_AGENT_FAKE === "1" && !process.env.VERCEL;

function provider(): Provider {
  if (fakeMode()) return fakeProvider;
  const client = new Anthropic();
  return { create: (p) => client.messages.create(p) };
}

const EVENT_TYPES = ["wedding", "social", "corporate", "family_day"] as const;

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "consultar_disponibilidad",
    description:
      "Indica si una fecha está libre en el calendario del local. Úsala antes de afirmar disponibilidad.",
    input_schema: {
      type: "object",
      properties: { fecha: { type: "string", description: "Fecha en formato AAAA-MM-DD" } },
      required: ["fecha"],
    },
  },
  {
    name: "estimar_precio",
    description:
      "Rango referencial del alquiler del local (con IGV), adelanto y garantía según tipo de evento, fecha e invitados. No incluye catering ni proveedores.",
    input_schema: {
      type: "object",
      properties: {
        tipo_evento: { type: "string", enum: [...EVENT_TYPES] },
        fecha: { type: "string", description: "AAAA-MM-DD" },
        invitados: { type: "integer", minimum: 1, maximum: 500 },
      },
      required: ["tipo_evento", "fecha", "invitados"],
    },
  },
  {
    name: "registrar_lead",
    description:
      "Registra al cliente para que el equipo lo contacte. Llámala una sola vez, cuando tengas al menos nombre y celular.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        celular: { type: "string" },
        correo: { type: "string" },
        tipo_evento: { type: "string", enum: [...EVENT_TYPES] },
        fecha: { type: "string", description: "AAAA-MM-DD, si la tiene" },
        invitados: { type: "integer" },
        quiere_visita: { type: "boolean", description: "Si pidió visitar el local" },
        resumen: { type: "string", description: "Resumen breve de lo conversado para el equipo" },
      },
      required: ["nombre", "celular", "tipo_evento", "resumen"],
    },
  },
  {
    name: "derivar_a_persona",
    description:
      "Deriva a una persona del equipo: descuentos, excepciones al reglamento, reclamos, temas legales o cualquier cosa que no sepas.",
    input_schema: {
      type: "object",
      properties: { motivo: { type: "string" }, resumen: { type: "string" } },
      required: ["motivo", "resumen"],
    },
  },
];

async function systemPrompt(venue: Venue, settings: Record<string, unknown>) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  const capacity = settings.capacity as Record<string, number> | undefined;
  return [
    `Eres el asistente virtual de ${venue.name} (${venue.endorsement}), local para eventos en Pachacámac, Lima.`,
    `Hoy es ${formatDate(today)} (zona horaria de Lima). Escribe en español peruano, cálido y breve, como en WhatsApp (máximo 3 oraciones por mensaje).`,
    "",
    "Qué ofrecemos:",
    ...SEGMENTS.map(
      (s) =>
        `- ${s.nav}: ${s.lead} ${s.promise.join(" ")}${capacity?.[s.capacityKey] ? ` Aforo referencial: ${capacity[s.capacityKey]} personas.` : ""}`,
    ),
    "",
    "Preguntas frecuentes:",
    ...FAQ.map((f) => `- ${f.q} ${f.a}`),
    "",
    "Reglas:",
    "1. Para disponibilidad usa siempre consultar_disponibilidad; nunca la supongas.",
    "2. Precios: solo el rango de estimar_precio, aclarando que es referencial, con IGV, solo por el alquiler del local y que la cotización formal la envía el equipo. Nunca ofrezcas descuentos ni inventes montos.",
    "3. No confirmas ni separas fechas: la separación se hace con el adelanto y la gestiona el equipo.",
    "4. Pide nombre y celular para que el equipo lo contacte y llama a registrar_lead una sola vez. Si pide visitar el local, márcalo.",
    "5. Descuentos, excepciones, reclamos, temas legales o lo que no sepas: derivar_a_persona.",
    "6. No pidas datos sensibles (DNI, tarjetas). No hables de otros clientes ni de otros locales.",
    "7. Si el cliente viene de una wedding planner, indícale que su planner puede gestionar la reserva.",
  ].join("\n");
}

type ToolContext = {
  venue: Venue;
  attribution: Partial<NewLead>;
  transcript: ChatMessage[];
  lead: { leadId: string; activityId: string } | null;
};

async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, unknown>> {
  const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
  const date = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(str(k)) ? str(k) : null);
  const type = (k: string) =>
    (EVENT_TYPES as readonly string[]).includes(str(k)) ? (str(k) as EventType) : null;

  switch (name) {
    case "consultar_disponibilidad": {
      const fecha = date("fecha");
      if (!fecha) return { error: "fecha_invalida" };
      const [row] = await withDb({ kind: "anon" }, (sql) =>
        sql<{ ok: boolean }>(`select public.is_date_available($1, $2) as ok`, [
          ctx.venue.slug,
          fecha,
        ]),
      );
      return { fecha: formatDate(fecha), disponible: row.ok };
    }
    case "estimar_precio": {
      const fecha = date("fecha");
      const tipo = type("tipo_evento");
      const invitados = Number(input.invitados);
      if (!fecha || !tipo || !(invitados > 0)) return { error: "datos_incompletos" };
      const pc = await loadPricingContext(ctx.venue.id);
      try {
        const r = estimateRange(
          pc.cards,
          { eventType: tipo, date: fecha, guests: invitados },
          pc.holidays,
          pc.settings,
        );
        return {
          desde: formatPEN(r.min),
          hasta: formatPEN(r.max),
          adelanto: formatPEN(r.base.deposit),
          garantia_reembolsable: formatPEN(r.base.guarantee),
          nota: "Referencial, con IGV, solo alquiler del local. Tarifario por validar.",
        };
      } catch (error) {
        if (error instanceof PricingError) return { error: "cotizacion_a_medida" };
        throw error;
      }
    }
    case "registrar_lead": {
      if (ctx.lead) return { ok: true, nota: "El lead ya estaba registrado en esta conversación." };
      const tipo = type("tipo_evento");
      if (!str("nombre") || str("celular").replace(/\D/g, "").length < 9 || !tipo) {
        return { error: "faltan_nombre_celular_o_tipo" };
      }
      const invitados = Number(input.invitados);
      const { leadId } = await createLead(
        {
          ...ctx.attribution,
          fullName: str("nombre").slice(0, 120),
          phone: str("celular").slice(0, 20),
          email: /^\S+@\S+\.\S+$/.test(str("correo")) ? str("correo") : null,
          eventType: tipo,
          eventDate: date("fecha"),
          guests:
            Number.isInteger(invitados) && invitados > 0 && invitados <= 500 ? invitados : null,
          message: str("resumen").slice(0, 1000),
          marketing: false,
          sourceForm: "chat",
        },
        ACTOR,
      );
      const activityId = await withDb(ACTOR, async (sql) => {
        const [a] = await sql<{ id: string }>(
          `insert into activities (lead_id, kind, notes, actor_type) values ($1, 'chat', $2, 'agent') returning id`,
          [leadId, transcriptText(ctx.transcript)],
        );
        await sql(
          `insert into activities (lead_id, kind, notes, due_at, actor_type)
           values ($1, 'task', $2, now() + interval '2 hours', 'agent')`,
          [
            leadId,
            input.quiere_visita
              ? "Llamar al lead del chat: pidió visitar el local"
              : "Llamar al lead del chat",
          ],
        );
        return a.id;
      });
      ctx.lead = { leadId, activityId };
      return { ok: true };
    }
    case "derivar_a_persona": {
      const [proposal] = await withDb(ACTOR, (sql) =>
        sql<{ id: string }>(
          `insert into agent_proposals (venue_id, agent, kind, title, body, lead_id)
           values ($1, $2, 'handoff', $3, $4, $5) returning id`,
          [
            ctx.venue.id,
            AGENT,
            `Derivación: ${str("motivo").slice(0, 120) || "sin motivo"}`,
            `${str("resumen").slice(0, 2000)}\n\n--- Conversación ---\n${transcriptText(ctx.transcript)}`,
            ctx.lead?.leadId ?? null,
          ],
        ),
      );
      await alertStaff({
        venueId: ctx.venue.id,
        venueName: ctx.venue.name,
        dedupeKey: `agent_handoff:${proposal.id}`,
        title: `Motivo: ${str("motivo").slice(0, 120) || "sin motivo"}`,
        lines: [str("resumen").slice(0, 500) || "Sin resumen"],
        path: "/admin/agentes",
        leadId: ctx.lead?.leadId,
      });
      return { ok: true, nota: "Una persona del equipo continuará la conversación." };
    }
    default:
      return { error: "herramienta_desconocida" };
  }
}

const transcriptText = (t: ChatMessage[]) =>
  t.map((m) => `${m.role === "user" ? "Cliente" : "Asistente"}: ${m.content}`).join("\n");

export type ChatReply = { reply: string; leadRef: string | null };

const FALLBACK =
  "En este momento no puedo responder por aquí. Escríbenos por WhatsApp o déjanos tus datos en el formulario y te contactamos.";

export async function recepcionistaReply(
  messages: ChatMessage[],
  ref: unknown,
  attribution: Partial<NewLead>,
): Promise<ChatReply> {
  const venue = await activeVenue();
  const lead = verifyLeadRef(ref);
  const settings = await withDb(ACTOR, async (sql) =>
    Object.fromEntries(
      (
        await sql<{ key: string; value: unknown }>(
          `select key, value from settings where venue_id = $1`,
          [venue.id],
        )
      ).map((r) => [r.key, r.value]),
    ),
  );
  const pricing = (settings.agent_pricing_usd_per_mtok as TokenPricing) ?? { input: 3, output: 15 };
  const [{ spent }] = await withDb(ACTOR, (sql) =>
    sql<{ spent: number }>(
      `select coalesce(sum(cost_usd), 0)::float8 as spent from agent_runs
        where venue_id = $1 and started_at >= date_trunc('month', now() at time zone 'America/Lima') at time zone 'America/Lima'`,
      [venue.id],
    ),
  );
  const record = (status: string, usage: { input: number; output: number }, error?: string) =>
    withDb(ACTOR, (sql) =>
      sql(
        `insert into agent_runs (venue_id, agent, input_tokens, output_tokens, cost_usd, status, error, lead_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          venue.id,
          AGENT,
          usage.input,
          usage.output,
          runCost({ inputTokens: usage.input, outputTokens: usage.output }, pricing),
          status,
          error ?? null,
          ctx.lead?.leadId ?? null,
        ],
      ),
    );

  const ctx: ToolContext = { venue, attribution, transcript: messages, lead };
  if (!withinBudget(spent, Number(settings.agent_monthly_budget_usd ?? 0))) {
    await record("budget_exceeded", { input: 0, output: 0 });
    return { reply: FALLBACK, leadRef: lead ? leadRef(lead.leadId, lead.activityId) : null };
  }

  const usage = { input: 0, output: 0 };
  const convo: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const system = await systemPrompt(venue, settings);
  let reply = "";
  try {
    const llm = provider();
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await llm.create({
        model: process.env.ANTHROPIC_MODEL ?? "fake",
        max_tokens: 600,
        system,
        tools: round < MAX_TOOL_ROUNDS ? TOOLS : [],
        messages: convo,
      });
      usage.input += res.usage.input_tokens;
      usage.output += res.usage.output_tokens;
      const text = res.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      const calls = res.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
      );
      if (res.stop_reason !== "tool_use" || calls.length === 0) {
        reply = text;
        break;
      }
      convo.push({ role: "assistant", content: res.content });
      const results: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const call of calls) {
        const out = await runTool(call.name, (call.input ?? {}) as Record<string, unknown>, ctx);
        results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(out) });
      }
      convo.push({ role: "user", content: results });
    }
    if (!reply) reply = FALLBACK;
  } catch (error) {
    console.error("recepcionista", error);
    await record("error", usage, error instanceof Error ? error.message.slice(0, 500) : "error");
    return {
      reply: FALLBACK,
      leadRef: ctx.lead ? leadRef(ctx.lead.leadId, ctx.lead.activityId) : null,
    };
  }

  // Transcripción completa en la actividad del lead (incluye la respuesta de este turno)
  if (ctx.lead) {
    const full = [...messages, { role: "assistant" as const, content: reply }];
    await withDb(ACTOR, (sql) =>
      sql(`update activities set notes = $2 where id = $1 and lead_id = $3 and kind = 'chat'`, [
        ctx.lead!.activityId,
        transcriptText(full),
        ctx.lead!.leadId,
      ]),
    );
  }
  await record("ok", usage);
  return { reply, leadRef: ctx.lead ? leadRef(ctx.lead.leadId, ctx.lead.activityId) : null };
}

// ---------------------------------------------------------------------------
// Proveedor simulado para local/CI (OASIS_AGENT_FAKE=1, nunca en Vercel): ejercita las mismas
// herramientas sin llamar a la API.
// ---------------------------------------------------------------------------
const fakeProvider: Provider = {
  async create(p) {
    const usage = { input_tokens: 800, output_tokens: 60 } as Anthropic.Messages.Usage;
    const last = p.messages[p.messages.length - 1];
    const msg = (content: Anthropic.Messages.ContentBlock[], stop: "end_turn" | "tool_use") =>
      ({
        id: "fake",
        type: "message",
        role: "assistant",
        model: "fake",
        content,
        stop_reason: stop,
        usage,
      }) as unknown as Anthropic.Messages.Message;
    const text = (t: string) =>
      msg([{ type: "text", text: t, citations: null } as Anthropic.Messages.TextBlock], "end_turn");
    const tool = (name: string, input: Record<string, unknown>) =>
      msg(
        [{ type: "tool_use", id: `tu_${name}`, name, input } as Anthropic.Messages.ToolUseBlock],
        "tool_use",
      );

    if (Array.isArray(last.content)) {
      const result = last.content.find((b) => b.type === "tool_result") as
        Anthropic.Messages.ToolResultBlockParam | undefined;
      const data = JSON.parse(String(result?.content ?? "{}")) as Record<string, unknown>;
      if ("disponible" in data)
        return text(
          data.disponible
            ? `El ${data.fecha} está disponible.`
            : `El ${data.fecha} no está disponible.`,
        );
      if ("desde" in data)
        return text(`El alquiler va de ${data.desde} a ${data.hasta} (referencial, con IGV).`);
      if (result?.tool_use_id === "tu_registrar_lead")
        return text("¡Listo! El equipo te llamará pronto.");
      return text("Una persona del equipo continuará la conversación.");
    }
    const t = String(last.content);
    const iso = t.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const named = t.match(/me llamo ([^,]+), mi celular es (\d{9})/i);
    if (named)
      return tool("registrar_lead", {
        nombre: named[1],
        celular: named[2],
        tipo_evento: "wedding",
        fecha: iso,
        resumen: t,
        quiere_visita: /visita/i.test(t),
      });
    if (/descuento/i.test(t))
      return tool("derivar_a_persona", { motivo: "Pide descuento", resumen: t });
    if (iso && /precio|cu[aá]nto/i.test(t))
      return tool("estimar_precio", { tipo_evento: "wedding", fecha: iso, invitados: 100 });
    if (iso) return tool("consultar_disponibilidad", { fecha: iso });
    return text(
      "¡Hola! Soy el asistente de Oasis Pachacámac. ¿Para qué fecha y tipo de evento buscas?",
    );
  },
};
