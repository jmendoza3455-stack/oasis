import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_PARAMS,
  parseAttributionCookie,
} from "@/lib/attribution-cookie";
import { sanitizeChat } from "@/lib/domain";
import { recepcionistaEnabled, recepcionistaReply } from "@/server/agents/recepcionista";
import { withinRateLimit } from "@/server/public/antispam";

export const maxDuration = 60;

const KEYS = [...ATTRIBUTION_PARAMS, "landing_path", "referrer"] as const;

/** Atribución first-touch: la del navegador (localStorage) y, si no llega, la cookie del proxy. */
function attributionFrom(body: unknown, cookie: Record<string, string | undefined>) {
  const fromBody = (body ?? {}) as Record<string, unknown>;
  const pick = (src: Record<string, unknown>) =>
    Object.fromEntries(
      KEYS.filter((k) => typeof src[k] === "string" && src[k]).map((k) => [
        k,
        String(src[k]).slice(0, 300),
      ]),
    );
  const browser = pick(fromBody);
  return Object.keys(browser).length ? browser : pick(cookie);
}

export async function POST(request: Request) {
  if (!recepcionistaEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    leadRef?: unknown;
    attribution?: unknown;
  } | null;
  const messages = sanitizeChat(body?.messages);
  if (!messages) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!(await withinRateLimit("chat", 30))) {
    return NextResponse.json(
      { reply: "Recibimos muchos mensajes seguidos. Intenta en unos minutos.", leadRef: null },
      { status: 429 },
    );
  }
  const cookie = parseAttributionCookie((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  const result = await recepcionistaReply(
    messages,
    body?.leadRef,
    attributionFrom(body?.attribution, cookie),
  );
  return NextResponse.json(result);
}
