"use client";

import { MessageCircle, MessagesSquare } from "lucide-react";
import { useMemo } from "react";
import { ATTRIBUTION_STORAGE_KEY, parseAttribution, track } from "@/lib/tracking";
import { useStored } from "@/lib/use-stored";

const NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
export const OPEN_CHAT_EVENT = "oasis:open-chat";

/** Barra fija en móvil: Cotizar, WhatsApp y chat, sin tapar el contenido. */
export function MobileActionBar({ chat }: { chat: boolean }) {
  const raw = useStored(ATTRIBUTION_STORAGE_KEY);
  const campaign = useMemo(() => parseAttribution(raw).utm_campaign, [raw]);
  const wa = NUMBER
    ? `https://wa.me/${NUMBER}?text=${encodeURIComponent(
        `Hola, quisiera información de Oasis Pachacámac${campaign ? ` (código ${campaign})` : ""}.`,
      )}`
    : null;
  return (
    <nav
      aria-label="Acciones rápidas"
      className="bg-card/95 fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t p-2 backdrop-blur md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <a
        href="#cotizar"
        className="bg-brand-green text-brand-sand flex-1 rounded-md px-3 py-3 text-center text-sm font-medium"
      >
        Consultar fecha
      </a>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp_click", { campaign })}
          className="flex items-center gap-1.5 rounded-md bg-[#1f7a4d] px-3 py-3 text-sm font-medium text-white"
        >
          <MessageCircle className="size-4" aria-hidden /> WhatsApp
        </a>
      )}
      {chat && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
          className="flex items-center gap-1.5 rounded-md border px-3 py-3 text-sm font-medium"
        >
          <MessagesSquare className="size-4" aria-hidden /> Chat
        </button>
      )}
    </nav>
  );
}
