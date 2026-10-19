import { after, NextResponse } from "next/server";
import { parseInbound } from "@/lib/domain";
import { verifyToken, verifyWebhookSignature, whatsappEnabled } from "@/lib/whatsapp";
import { handleWhatsappMessage } from "@/server/agents/whatsapp";

// Webhook de WhatsApp Business Cloud API. Meta valida con GET (hub.challenge) y envía mensajes
// por POST firmados con X-Hub-Signature-256. Respondemos 200 de inmediato y procesamos después.
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (
    whatsappEnabled() &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    verifyToken(url.searchParams.get("hub.verify_token"))
  ) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  if (!whatsappEnabled()) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const messages = parseInbound(payload);
  after(async () => {
    for (const m of messages) {
      try {
        await handleWhatsappMessage(m);
      } catch (error) {
        console.error("whatsapp inbound", error);
      }
    }
  });
  return NextResponse.json({ received: messages.length });
}
