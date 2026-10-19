"use client";

import { MessageCircle, MessagesSquare } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { ATTRIBUTION_STORAGE_KEY, parseAttribution, track } from "@/lib/tracking";
import { useStored } from "@/lib/use-stored";
import { cn } from "@/lib/utils";
import { CtaLink } from "./cta-link";

const NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
export const OPEN_CHAT_EVENT = "oasis:open-chat";

// La barra aparece al pasar el primer pantallazo: así no repite el botón de la portada
const subscribeScroll = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
};
const pastHero = () => window.scrollY > window.innerHeight * 0.6;

/** Barra fija en móvil: ver fechas, WhatsApp y chat, sin tapar el contenido. */
export function MobileActionBar({ chat }: { chat: boolean }) {
  const raw = useStored(ATTRIBUTION_STORAGE_KEY);
  const campaign = useMemo(() => parseAttribution(raw).utm_campaign, [raw]);
  const visible = useSyncExternalStore(subscribeScroll, pastHero, () => false);
  const wa = NUMBER
    ? `https://wa.me/${NUMBER}?text=${encodeURIComponent(
        `Hola, quisiera información de Oasis Pachacámac${campaign ? ` (código ${campaign})` : ""}.`,
      )}`
    : null;
  return (
    <nav
      aria-label="Acciones rápidas"
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "bg-card/95 fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t p-2 backdrop-blur transition-transform duration-300 md:hidden",
        !visible && "translate-y-full",
      )}
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <CtaLink className="bg-brand-green text-brand-sand dark:bg-brand-camel flex-1 rounded-md px-3 py-3 text-center text-sm font-medium dark:text-[#2a2418]" />
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
