import "server-only";
import { createHash } from "node:crypto";
import { withDb } from "@/lib/db";
import {
  appendMessage,
  campaignFromText,
  localPhone,
  type ChatMessage,
  type InboundMessage,
} from "@/lib/domain";
import { sendWhatsappText } from "@/lib/whatsapp";
import { recepcionistaEnabled, recepcionistaReply } from "@/server/agents/recepcionista";
import type { NewLead } from "@/server/public/leads";
import { activeVenue } from "@/server/venue";

// Recepcionista por WhatsApp: mismo agente, mismas herramientas y mismos límites que el chat web.
// Un mensaje entrante → respuesta del agente → envío por la Cloud API (ventana de 24 h abierta).

const ACTOR = { kind: "service", actorType: "agent", actorName: "recepcionista" } as const;
const FALLBACK =
  "Gracias por escribirnos. En breve una persona del equipo te responde por este medio.";

type Conversation = {
  id: string;
  messages: ChatMessage[];
  leadRef: string | null;
  attribution: Partial<NewLead>;
};

export async function handleWhatsappMessage(
  msg: InboundMessage,
): Promise<"done" | "duplicate" | "limited"> {
  const venue = await activeVenue();
  // Meta reintenta webhooks: cada mensaje se procesa una sola vez
  const fresh = await withDb(ACTOR, (sql) =>
    sql(
      `insert into whatsapp_inbound (message_id) values ($1) on conflict do nothing returning message_id`,
      [msg.id],
    ),
  );
  if (fresh.length === 0) return "duplicate";

  const [{ ok }] = await withDb(ACTOR, (sql) =>
    sql<{ ok: boolean }>(`select public.hit_rate_limit($1, 600, 30) as ok`, [
      `wa:${createHash("sha256").update(msg.from).digest("hex").slice(0, 32)}`,
    ]),
  );
  if (!ok) return "limited";

  const conv = await withDb(ACTOR, async (sql) => {
    const [row] = await sql<Conversation>(
      `insert into whatsapp_conversations (venue_id, wa_id, profile_name, last_inbound_at)
       values ($1, $2, $3, now())
       on conflict (venue_id, wa_id) do update
         set profile_name = coalesce(excluded.profile_name, whatsapp_conversations.profile_name),
             last_inbound_at = now(), updated_at = now()
       returning id, messages, lead_ref as "leadRef", attribution`,
      [venue.id, msg.from, msg.name],
    );
    return row;
  });

  // Atribución: el botón de la web agrega "(código campaña)" al primer mensaje (regla 8)
  const campaign = campaignFromText(msg.text);
  const attribution: Partial<NewLead> =
    Object.keys(conv.attribution ?? {}).length > 0
      ? conv.attribution
      : campaign
        ? { utm_source: "whatsapp", utm_medium: "click_to_chat", utm_campaign: campaign }
        : { referrer: "whatsapp" };

  const history = appendMessage(conv.messages ?? [], { role: "user", content: msg.text });
  let reply = FALLBACK;
  let leadRef = conv.leadRef;
  if (recepcionistaEnabled()) {
    const res = await recepcionistaReply(history, conv.leadRef, attribution, {
      kind: "whatsapp",
      phone: localPhone(msg.from),
      name: msg.name,
    });
    reply = res.reply;
    leadRef = res.leadRef ?? leadRef;
  }
  const sent = await sendWhatsappText(msg.from, reply);
  const next = appendMessage(history, { role: "assistant", content: reply });
  await withDb(ACTOR, (sql) =>
    sql(
      `update whatsapp_conversations set messages = $2, lead_ref = $3, attribution = $4, updated_at = now()
        where id = $1`,
      [conv.id, JSON.stringify(next), leadRef, JSON.stringify(attribution)],
    ),
  );
  if (!sent.ok) console.error("whatsapp send", sent.error);
  return "done";
}
