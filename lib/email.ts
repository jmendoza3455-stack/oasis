import "server-only";

// Envío de correo con Resend (API HTTP, sin SDK). Sin RESEND_API_KEY/EMAIL_FROM el aviso queda
// "skipped" en el outbox: el sistema funciona igual y el admin ve qué se habría enviado.

export type EmailResult =
  { status: "sent"; providerId: string | null } | { status: "skipped" | "failed"; error: string };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#2a2418">${paragraphs}</div>`;
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { status: "skipped", error: "Sin proveedor de correo configurado" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        text: input.text,
        html: textToHtml(input.text),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { status: "failed", error: data.message ?? `HTTP ${res.status}` };
    return { status: "sent", providerId: data.id ?? null };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "error de red" };
  }
}
