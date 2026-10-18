import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Enlace de encuesta NPS firmado: /encuesta/{bookingId}.{firma}. Sin login y sin adivinar ids.
const secret = () => process.env.NPS_SECRET ?? process.env.RATE_LIMIT_SALT ?? "oasis-dev-nps";
const sign = (id: string) =>
  createHmac("sha256", secret()).update(`nps:${id}`).digest("base64url").slice(0, 22);

export function npsToken(bookingId: string) {
  return `${bookingId}.${sign(bookingId)}`;
}

export function verifyNpsToken(token: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
