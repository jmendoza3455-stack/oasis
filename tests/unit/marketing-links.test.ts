import { describe, expect, it } from "vitest";
import { isBot, normalizeCode, pieceLinks, resolvePieceRedirect } from "@/lib/marketing/links";

describe("links por pieza", () => {
  it("normaliza códigos y rechaza los inválidos", () => {
    expect(normalizeCode("R01")).toBe("r01");
    expect(normalizeCode("r01b")).toBe("r01b");
    expect(normalizeCode("../x")).toBeNull();
    expect(normalizeCode("a")).toBeNull();
  });

  it("arma los links para copiar", () => {
    expect(pieceLinks("https://oasis.pe/", "r01")).toEqual({
      instagram: "https://oasis.pe/r/r01?s=instagram",
      tiktok: "https://oasis.pe/r/r01?s=tiktok",
      facebook: "https://oasis.pe/r/r01?s=facebook",
      whatsapp: "https://oasis.pe/r/r01?s=instagram&to=wa",
    });
  });

  it("redirige a la consulta de fechas con utm_content = código", () => {
    expect(resolvePieceRedirect({ code: "r01", s: "tiktok" })).toEqual({
      url: "/?utm_source=tiktok&utm_medium=social&utm_campaign=organico&utm_content=r01#cotizar",
      code: "r01",
      network: "tiktok",
      target: "web",
    });
    expect(resolvePieceRedirect({ code: "r01", s: "myspace" })?.network).toBe("otro");
    expect(resolvePieceRedirect({ code: "../../etc" })).toBeNull();
  });

  it("WhatsApp lleva el código de la pieza; sin número configurado va a la web", () => {
    const wa = resolvePieceRedirect({
      code: "c03",
      s: "instagram",
      to: "wa",
      whatsappNumber: "51999999999",
    })!;
    expect(wa.target).toBe("whatsapp");
    expect(decodeURIComponent(wa.url)).toContain("(código pieza-c03)");
    expect(resolvePieceRedirect({ code: "c03", to: "wa", whatsappNumber: "" })?.target).toBe("web");
  });

  it("no cuenta vistas previas ni bots", () => {
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("WhatsApp/2.23.20 A")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 300.0")).toBe(false);
    expect(isBot(null)).toBe(false);
  });
});
