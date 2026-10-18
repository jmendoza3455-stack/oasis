import { Analytics } from "@/components/public/analytics";
import { ChatLauncher } from "@/components/public/chat-launcher";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { WhatsAppButton } from "@/components/public/whatsapp-button";
import { recepcionistaEnabled } from "@/server/agents/recepcionista";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#contenido"
        className="focus:bg-card sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:p-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppButton />
      {recepcionistaEnabled() && <ChatLauncher />}
      <Analytics />
    </>
  );
}
