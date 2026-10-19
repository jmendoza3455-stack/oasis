import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cliente mínimo de WhatsApp Business Cloud API (Graph API de Meta).
// Variables: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN.
// En local/CI, OASIS_WHATSAPP_FAKE=1 (nunca en Vercel) simula el envío sin llamar a Meta.

const GRAPH = "https://graph.facebook.com/v21.0";

export const whatsappFake = () => process.env.OASIS_WHATSAPP_FAKE === "1" && !process.env.VERCEL;

export function whatsappEnabled(): boolean {
  return (
    whatsappFake() ||
    Boolean(
      process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_APP_SECRET &&
      process.env.WHATSAPP_VERIFY_TOKEN,
    )
  );
}

const appSecret = () =>
  process.env.WHATSAPP_APP_SECRET ?? (whatsappFake() ? "oasis-dev-whatsapp" : "");

/** Firma X-Hub-Signature-256 de Meta: "sha256=" + HMAC-SHA256(app secret, cuerpo crudo). */
export function signWebhook(raw: string): string {
  return `sha256=${createHmac("sha256", appSecret()).update(raw).digest("hex")}`;
}

export function verifyWebhookSignature(raw: string, header: string | null): boolean {
  if (!header || !appSecret()) return false;
  const expected = Buffer.from(signWebhook(raw));
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function verifyToken(token: string | null): boolean {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? (whatsappFake() ? "oasis-dev-verify" : "");
  return Boolean(expected && token && token === expected);
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

/** Envía un texto libre (solo dentro de la ventana de 24 h desde el último mensaje del cliente). */
export async function sendWhatsappText(to: string, body: string): Promise<SendResult> {
  if (whatsappFake()) return { ok: true, id: null };
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: body.slice(0, 4096), preview_url: false },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, id: data.messages?.[0]?.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "error de red" };
  }
}
