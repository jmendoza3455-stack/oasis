import type { ChatMessage } from "./agents";

// WhatsApp Business Cloud API: parseo puro del webhook de Meta y manejo del historial.

export type InboundMessage = { id: string; from: string; name: string | null; text: string };

/**
 * Extrae los mensajes de texto de un webhook de Meta (entry[].changes[].value.messages[]).
 * Ignora estados (entregado/leído) y tipos no soportados (audio, imagen…).
 */
export function parseInbound(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value ?? {};
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const names = new Map<string, string>();
      for (const c of contacts as { wa_id?: string; profile?: { name?: string } }[]) {
        if (c.wa_id && c.profile?.name) names.set(c.wa_id, c.profile.name);
      }
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const m of messages as {
        id?: string;
        from?: string;
        type?: string;
        text?: { body?: string };
        button?: { text?: string };
        interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
      }[]) {
        const text =
          m.type === "text"
            ? m.text?.body
            : m.type === "button"
              ? m.button?.text
              : m.type === "interactive"
                ? (m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title)
                : undefined;
        if (!m.id || !m.from || !/^\d{8,15}$/.test(m.from) || !text?.trim()) continue;
        out.push({
          id: m.id,
          from: m.from,
          name: names.get(m.from) ?? null,
          text: text.trim().slice(0, 1500),
        });
      }
    }
  }
  return out;
}

/** Código de campaña que el botón de WhatsApp de la web agrega al mensaje: "(código bodas-verano)". */
export function campaignFromText(text: string): string | null {
  const m = text.match(/\(c[oó]digo\s+([\w-]{2,150})\)/i);
  return m ? m[1] : null;
}

/** Celular peruano de 9 dígitos a partir del wa_id (51 + número). */
export function localPhone(waId: string): string {
  return waId.startsWith("51") && waId.length === 11 ? waId.slice(2) : waId;
}

/**
 * Agrega un mensaje al historial manteniendo la alternancia que exige el modelo: mensajes seguidos
 * del mismo rol se unen, y se conservan los últimos `max` mensajes empezando por el usuario.
 */
export function appendMessage(
  history: readonly ChatMessage[],
  msg: ChatMessage,
  max = 20,
): ChatMessage[] {
  const next = [...history];
  const last = next[next.length - 1];
  if (last && last.role === msg.role)
    next[next.length - 1] = { role: msg.role, content: `${last.content}\n${msg.content}` };
  else next.push(msg);
  let trimmed = next.slice(-max);
  while (trimmed.length && trimmed[0].role !== "user") trimmed = trimmed.slice(1);
  return trimmed;
}
