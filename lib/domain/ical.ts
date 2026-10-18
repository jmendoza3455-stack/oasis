import { addDays, type ISODate } from "./calendar";

// Feed iCal (RFC 5545) del calendario maestro: eventos de día completo, sin datos personales.

export type IcsEvent = {
  uid: string;
  start: ISODate;
  /** Último día inclusive (por defecto, el mismo día). */
  end?: ISODate;
  summary: string;
  description?: string;
  url?: string;
  updatedAt: Date;
};

export function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const utf8 = new TextEncoder();

/** Pliega líneas a 75 octetos (RFC 5545 §3.1) sin partir caracteres multibyte. */
export function icsFold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = utf8.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const day = (d: ISODate) => d.replace(/-/g, "");

export function buildIcs(calendarName: string, events: readonly IcsEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SAWA//Oasis Pachacamac//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
    "X-WR-TIMEZONE:America/Lima",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp(e.updatedAt)}`,
      `DTSTART;VALUE=DATE:${day(e.start)}`,
      `DTEND;VALUE=DATE:${day(addDays(e.end ?? e.start, 1))}`,
      `SUMMARY:${icsEscape(e.summary)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("TRANSP:OPAQUE", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
