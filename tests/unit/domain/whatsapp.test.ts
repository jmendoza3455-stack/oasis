import { describe, expect, it } from "vitest";
import { appendMessage, campaignFromText, localPhone, parseInbound } from "@/lib/domain";

const webhook = (messages: unknown[], contacts: unknown[] = []) => ({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: { contacts, messages } }] }],
});

describe("parseInbound", () => {
  it("extrae textos, botones y respuestas interactivas con el nombre del perfil", () => {
    const out = parseInbound(
      webhook(
        [
          { id: "m1", from: "51987654321", type: "text", text: { body: " Hola " } },
          { id: "m2", from: "51987654321", type: "button", button: { text: "Sí" } },
          {
            id: "m3",
            from: "51987654321",
            type: "interactive",
            interactive: { list_reply: { title: "Boda" } },
          },
          {
            id: "m4",
            from: "51987654321",
            type: "interactive",
            interactive: { button_reply: { title: "Ver fechas" } },
          },
        ],
        [{ wa_id: "51987654321", profile: { name: "Ana" } }],
      ),
    );
    expect(out.map((m) => m.text)).toEqual(["Hola", "Sí", "Boda", "Ver fechas"]);
    expect(out[0]).toEqual({ id: "m1", from: "51987654321", name: "Ana", text: "Hola" });
  });

  it("ignora estados, tipos no soportados y datos inválidos", () => {
    expect(parseInbound(null)).toEqual([]);
    expect(parseInbound({ entry: "x" })).toEqual([]);
    expect(parseInbound({ entry: [{ changes: "x" }] })).toEqual([]);
    expect(parseInbound({ entry: [{ changes: [{}] }] })).toEqual([]);
    expect(
      parseInbound(
        webhook([
          { id: "a", from: "51987654321", type: "audio" },
          { id: "b", from: "abc", type: "text", text: { body: "hola" } },
          { from: "51987654321", type: "text", text: { body: "sin id" } },
          { id: "c", from: "51987654321", type: "text", text: { body: "   " } },
          { id: "d", from: "51987654321", type: "interactive", interactive: {} },
        ]),
      ),
    ).toEqual([]);
  });
});

describe("helpers de WhatsApp", () => {
  it("lee el código de campaña del botón de la web", () => {
    expect(campaignFromText("Hola, quisiera información (código bodas-verano).")).toBe(
      "bodas-verano",
    );
    expect(campaignFromText("Hola (codigo fd_2027)")).toBe("fd_2027");
    expect(campaignFromText("Hola")).toBeNull();
  });

  it("convierte el wa_id peruano a celular local", () => {
    expect(localPhone("51987654321")).toBe("987654321");
    expect(localPhone("5491122334455")).toBe("5491122334455");
  });

  it("mantiene la alternancia y el límite del historial", () => {
    let h = appendMessage([], { role: "user", content: "hola" });
    h = appendMessage(h, { role: "user", content: "¿hay fecha?" });
    expect(h).toEqual([{ role: "user", content: "hola\n¿hay fecha?" }]);
    h = appendMessage(h, { role: "assistant", content: "sí" });
    for (let i = 0; i < 30; i++)
      h = appendMessage(h, { role: i % 2 ? "assistant" : "user", content: `m${i}` });
    expect(h.length).toBeLessThanOrEqual(20);
    expect(h[0].role).toBe("user");
  });
});
