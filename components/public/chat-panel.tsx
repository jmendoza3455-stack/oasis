"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readAttribution } from "@/lib/tracking";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "¡Hola! Soy el asistente virtual de Oasis Pachacámac. Cuéntame qué evento estás planeando y para qué fecha.";

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [leadRef, setLeadRef] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/recepcionista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, leadRef, attribution: readAttribution() ?? {} }),
      });
      const data = (await res.json()) as { reply?: string; leadRef?: string | null };
      setMessages([
        ...next,
        { role: "assistant", content: data.reply ?? "No pude responder. Intenta de nuevo." },
      ]);
      if (data.leadRef) setLeadRef(data.leadRef);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Se perdió la conexión. Intenta de nuevo." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      role="dialog"
      aria-label="Chat con Oasis Pachacámac"
      className="bg-card fixed right-4 bottom-4 left-4 z-50 flex max-h-[80dvh] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:left-auto sm:w-96"
    >
      <header className="bg-brand-green text-brand-sand flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium">Asistente virtual · responde al instante</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar chat"
          className="rounded p-1 hover:bg-white/10"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <div
        className="grid flex-1 content-start gap-2 overflow-y-auto p-4 text-sm"
        aria-live="polite"
      >
        <p className="bg-muted max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2">{GREETING}</p>
        {messages.map((m, i) => (
          <p
            key={i}
            className={
              m.role === "user"
                ? "bg-brand-olive ml-auto max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-white"
                : "bg-muted max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 whitespace-pre-wrap"
            }
          >
            {m.content}
          </p>
        ))}
        {pending && <p className="text-muted-foreground text-xs">Escribiendo…</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1500}
          aria-label="Tu mensaje"
          placeholder="Escribe tu mensaje"
          className="border-input bg-background min-w-0 flex-1 rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 md:text-sm"
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Enviar">
          <Send aria-hidden />
        </Button>
      </form>
      <p className="text-muted-foreground px-3 pb-2 text-[11px]">
        Asistente automático. Al escribir aceptas el{" "}
        <Link href="/privacidad" className="underline">
          aviso de privacidad
        </Link>
        . No compartas datos de tarjetas.
      </p>
    </section>
  );
}
