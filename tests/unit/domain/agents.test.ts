import { describe, expect, it } from "vitest";
import { runCost, sanitizeChat, withinBudget } from "@/lib/domain";

describe("runCost", () => {
  it("calcula USD por millón de tokens", () => {
    expect(runCost({ inputTokens: 2000, outputTokens: 500 }, { input: 3, output: 15 })).toBe(
      0.0135,
    );
    expect(runCost({ inputTokens: 0, outputTokens: 0 }, { input: 3, output: 15 })).toBe(0);
  });
});

describe("withinBudget", () => {
  it("corta al alcanzar el tope con margen", () => {
    expect(withinBudget(10, 30)).toBe(true);
    expect(withinBudget(29.96, 30)).toBe(false);
    expect(withinBudget(0, 0)).toBe(false);
    expect(withinBudget(0, Number.NaN)).toBe(false);
  });
});

describe("sanitizeChat", () => {
  it("acepta un historial que alterna y termina en el usuario", () => {
    expect(
      sanitizeChat([
        { role: "user", content: " Hola " },
        { role: "assistant", content: "¿En qué fecha?" },
        { role: "user", content: "20/02" },
      ]),
    ).toEqual([
      { role: "user", content: "Hola" },
      { role: "assistant", content: "¿En qué fecha?" },
      { role: "user", content: "20/02" },
    ]);
  });

  it("rechaza historiales manipulados o vacíos", () => {
    expect(sanitizeChat([])).toBeNull();
    expect(sanitizeChat("hola")).toBeNull();
    expect(sanitizeChat([null])).toBeNull();
    expect(sanitizeChat([{ role: "assistant", content: "x" }])).toBeNull();
    expect(
      sanitizeChat([
        { role: "user", content: "x" },
        { role: "assistant", content: "y" },
      ]),
    ).toBeNull();
    expect(sanitizeChat([{ role: "user", content: "   " }])).toBeNull();
    expect(sanitizeChat([{ role: "user", content: 5 }])).toBeNull();
    expect(sanitizeChat([{ role: "user", content: "x".repeat(1501) }])).toBeNull();
    expect(
      sanitizeChat(
        Array.from({ length: 31 }, (_, i) => ({
          role: i % 2 ? "assistant" : "user",
          content: "a",
        })),
      ),
    ).toBeNull();
  });
});
