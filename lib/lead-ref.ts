import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Referencia firmada de la conversación del chat: {leadId}.{activityId}.{firma}. El navegador la
// devuelve en cada turno para seguir el mismo lead sin poder apuntar a otro.
const secret = () => process.env.NPS_SECRET ?? process.env.RATE_LIMIT_SALT ?? "oasis-dev-chat";
const sign = (payload: string) =>
  createHmac("sha256", secret()).update(`chat:${payload}`).digest("base64url").slice(0, 22);
const UUID = /^[0-9a-f-]{36}$/;

export function leadRef(leadId: string, activityId: string): string {
  return `${leadId}.${activityId}.${sign(`${leadId}.${activityId}`)}`;
}

export function verifyLeadRef(ref: unknown): { leadId: string; activityId: string } | null {
  if (typeof ref !== "string") return null;
  const [leadId, activityId, sig] = ref.split(".");
  if (!UUID.test(leadId ?? "") || !UUID.test(activityId ?? "") || !sig) return null;
  const expected = Buffer.from(sign(`${leadId}.${activityId}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? { leadId, activityId }
    : null;
}
