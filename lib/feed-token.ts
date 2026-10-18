import { serverSecret } from "@/lib/secrets";
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Token del feed iCal: HMAC del venue. Rotar ICAL_SECRET invalida los calendarios suscritos.
const secret = () => serverSecret("ICAL_SECRET", "oasis-dev-ical");

export function icalToken(venueId: string): string {
  return createHmac("sha256", secret()).update(`ical:${venueId}`).digest("base64url").slice(0, 32);
}

export function verifyIcalToken(venueId: string, token: string): boolean {
  const expected = Buffer.from(icalToken(venueId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
