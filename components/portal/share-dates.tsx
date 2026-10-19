"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Texto listo para compartir con clientes (copiar o abrir WhatsApp). */
export function ShareDates({ text, count }: { text: string; count: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-card grid gap-3 rounded-xl border p-4">
      <p className="text-sm">
        <strong>{count}</strong> fechas libres de viernes a domingo y feriados en los próximos 90
        días.
      </p>
      <pre
        aria-label="Texto para compartir"
        className="bg-muted rounded p-3 text-xs whitespace-pre-wrap"
      >
        {text}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => undefined);
            setCopied(true);
          }}
        >
          <Copy aria-hidden /> {copied ? "Copiado" : "Copiar texto"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brand-green text-brand-sand inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
        >
          <MessageCircle className="size-4" aria-hidden /> Compartir por WhatsApp
        </a>
      </div>
    </div>
  );
}
