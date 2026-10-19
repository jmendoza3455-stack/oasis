"use client";

import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { ATTRIBUTION_STORAGE_KEY, parseAttribution, track } from "@/lib/tracking";
import { useStored } from "@/lib/use-stored";

const NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

/** Botón flotante de WhatsApp con mensaje prellenado. Solo aparece si el número está configurado. */
export function WhatsAppButton({ eventLabel }: { eventLabel?: string }) {
  const raw = useStored(ATTRIBUTION_STORAGE_KEY);
  const campaign = useMemo(() => parseAttribution(raw).utm_campaign, [raw]);
  if (!NUMBER) return null;

  const text = [
    "Hola, quisiera información de Oasis Pachacámac",
    eventLabel ? `para un evento de tipo ${eventLabel}` : null,
    campaign ? `(código ${campaign})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const href = `https://wa.me/${NUMBER}?text=${encodeURIComponent(text + ".")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("whatsapp_click", { campaign })}
      className="fixed right-4 bottom-4 z-40 hidden items-center gap-2 rounded-full bg-[#1f7a4d] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#19663f] md:flex"
    >
      <MessageCircle className="size-5" aria-hidden /> WhatsApp
    </a>
  );
}
