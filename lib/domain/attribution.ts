import { addDays, type ISODate } from "./calendar";

// Atribución del planner (OASIS.md §5.2): si un cliente que registró un planner entra directo
// dentro de los 90 días (match por teléfono, correo o RUC), se alerta y se respeta al planner.

export type ContactKeys = { phone?: string | null; email?: string | null; ruc?: string | null };

/** Teléfono peruano a 9 dígitos (quita +51, espacios y símbolos). */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0051")) digits = digits.slice(4);
  else if (digits.length === 11 && digits.startsWith("51")) digits = digits.slice(2);
  return digits.length >= 7 ? digits : null;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  return e && e.includes("@") ? e : null;
}

export function normalizeRuc(ruc: string | null | undefined): string | null {
  const r = ruc?.replace(/\D/g, "");
  return r && /^(10|15|17|20)\d{9}$/.test(r) ? r : null;
}

export type PlannerRegistration = ContactKeys & {
  plannerId: string;
  clientId: string;
  registeredOn: ISODate;
};

export type AttributionMatch = {
  plannerId: string;
  clientId: string;
  matchedOn: Array<"phone" | "email" | "ruc">;
  protectedUntil: ISODate;
};

export function protectedUntil(registeredOn: ISODate, protectionDays: number): ISODate {
  return addDays(registeredOn, protectionDays);
}

/**
 * Busca un registro de planner vigente que coincida con el nuevo contacto.
 * Si hay varios, gana el registro más antiguo (el primero que trajo al cliente).
 */
export function findProtectedMatch(
  incoming: ContactKeys,
  registrations: readonly PlannerRegistration[],
  today: ISODate,
  protectionDays: number,
): AttributionMatch | null {
  const keys = {
    phone: normalizePhone(incoming.phone),
    email: normalizeEmail(incoming.email),
    ruc: normalizeRuc(incoming.ruc),
  };
  if (!keys.phone && !keys.email && !keys.ruc) return null;

  const candidates = registrations
    .map((r) => {
      const matchedOn: AttributionMatch["matchedOn"] = [];
      if (keys.phone && normalizePhone(r.phone) === keys.phone) matchedOn.push("phone");
      if (keys.email && normalizeEmail(r.email) === keys.email) matchedOn.push("email");
      if (keys.ruc && normalizeRuc(r.ruc) === keys.ruc) matchedOn.push("ruc");
      return { r, matchedOn, until: protectedUntil(r.registeredOn, protectionDays) };
    })
    .filter((c) => c.matchedOn.length > 0 && c.r.registeredOn <= today && today <= c.until)
    .sort((a, b) => (a.r.registeredOn < b.r.registeredOn ? -1 : 1));

  const best = candidates[0];
  return best
    ? {
        plannerId: best.r.plannerId,
        clientId: best.r.clientId,
        matchedOn: best.matchedOn,
        protectedUntil: best.until,
      }
    : null;
}
