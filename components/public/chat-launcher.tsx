"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { track } from "@/lib/tracking";

// El panel se carga recién al abrir el chat: no pesa en la carga inicial (Lighthouse).
const ChatPanel = dynamic(() => import("./chat-panel").then((m) => m.ChatPanel), { ssr: false });

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  // La barra móvil abre el chat con un evento (en móvil no hay botón flotante)
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      track("chat_open");
    };
    window.addEventListener("oasis:open-chat", onOpen);
    return () => window.removeEventListener("oasis:open-chat", onOpen);
  }, []);
  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            track("chat_open");
          }}
          className="bg-brand-green text-brand-sand fixed right-4 bottom-20 z-40 hidden items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg hover:opacity-90 md:flex"
        >
          <MessagesSquare className="size-5" aria-hidden /> Chatea con nosotros
        </button>
      )}
    </>
  );
}
