import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { db } from "./helpers";

// Webhook de WhatsApp con proveedor simulado (OASIS_WHATSAPP_FAKE=1 y OASIS_AGENT_FAKE=1).
const SECRET = "oasis-dev-whatsapp";
const WA = "51911222333";
let seq = 0;

function payload(text: string, id = `wamid.e2e.${Date.now()}.${seq++}`) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ wa_id: WA, profile: { name: "Cliente WA" } }],
              messages: [{ id, from: WA, type: "text", text: { body: text } }],
            },
          },
        ],
      },
    ],
  };
}

async function post(request: APIRequestContext, body: unknown, signature?: string) {
  const raw = JSON.stringify(body);
  return request.post("/api/whatsapp", {
    data: raw,
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256":
        signature ?? `sha256=${createHmac("sha256", SECRET).update(raw).digest("hex")}`,
    },
  });
}

const conversation = async () =>
  (
    await db<{ messages: { role: string; content: string }[] }>(
      `select messages from whatsapp_conversations where wa_id = $1`,
      [WA],
    )
  )[0]?.messages ?? [];

test("verificación del webhook de Meta", async ({ request }) => {
  const ok = await request.get(
    "/api/whatsapp?hub.mode=subscribe&hub.verify_token=oasis-dev-verify&hub.challenge=12345",
  );
  expect(ok.status()).toBe(200);
  expect(await ok.text()).toBe("12345");
  const bad = await request.get(
    "/api/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=12345",
  );
  expect(bad.status()).toBe(403);
  expect((await post(request, payload("hola"), "sha256=firmafalsa")).status()).toBe(401);
});

test.describe("Recepcionista por WhatsApp (serial, solo desktop)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Muta datos");

  test("responde, registra el lead con la campaña del botón y no duplica reintentos", async ({
    request,
  }) => {
    const first = payload(
      "Hola, quisiera información (código bodas-wa-e2e). ¿Libre el 2030-06-15?",
    );
    expect((await post(request, first)).status()).toBe(200);
    await expect
      .poll(async () => (await conversation()).map((m) => m.content).join("|"))
      .toContain("El 15/06/2030 está disponible.");

    // Reintento de Meta con el mismo id: no se procesa de nuevo
    const before = (await conversation()).length;
    expect((await post(request, first)).status()).toBe(200);
    await new Promise((r) => setTimeout(r, 800));
    expect((await conversation()).length).toBe(before);

    expect(
      (await post(request, payload("Me llamo Wa Cliente, mi celular es 911222333"))).status(),
    ).toBe(200);
    await expect
      .poll(
        async () =>
          (
            await db<{ n: number }>(
              `select count(*)::int as n from leads l join clients c on c.id = l.client_id where c.full_name = 'Wa Cliente'`,
            )
          )[0].n,
      )
      .toBe(1);
    const [lead] = await db<{
      source_form: string;
      utm_campaign: string;
      channel: string;
      phone: string;
      first: boolean;
    }>(
      `select l.source_form, l.utm_campaign, l.channel, c.phone, l.first_response_at is not null as first
         from leads l join clients c on c.id = l.client_id where c.full_name = 'Wa Cliente'`,
    );
    expect(lead).toEqual({
      source_form: "whatsapp",
      utm_campaign: "bodas-wa-e2e",
      channel: "direct",
      phone: "911222333",
      first: true,
    });
  });
});
