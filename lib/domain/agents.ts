// Agentes de IA: costo por corrida y tope mensual (docs/agentes.md, principio 5).

export type TokenPricing = { input: number; output: number }; // USD por millón de tokens
export type Usage = { inputTokens: number; outputTokens: number };

/** Costo en USD de una corrida, redondeado a 4 decimales. */
export function runCost(usage: Usage, pricing: TokenPricing): number {
  const raw = (usage.inputTokens * pricing.input + usage.outputTokens * pricing.output) / 1_000_000;
  return Math.round(raw * 10_000) / 10_000;
}

/** true si todavía hay presupuesto para otra corrida (deja margen para una corrida típica). */
export function withinBudget(spentUsd: number, budgetUsd: number, reserveUsd = 0.05): boolean {
  if (!(budgetUsd > 0)) return false;
  return spentUsd + reserveUsd <= budgetUsd;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Valida el historial que envía el navegador: alterna roles, empieza y termina en el usuario. */
export function sanitizeChat(
  input: unknown,
  limits = { maxMessages: 30, maxChars: 1500 },
): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > limits.maxMessages) return null;
  const out: ChatMessage[] = [];
  for (const [i, m] of input.entries()) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as Record<string, unknown>;
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (role !== expected || typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > limits.maxChars) return null;
    out.push({ role: expected, content: text });
  }
  return out[out.length - 1].role === "user" ? out : null;
}
