import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Isotipo } from "@/components/brand/logo";
import { PortalNav } from "@/components/portal/nav";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/ingresar/actions";
import { plannerContext } from "@/server/queries/planner";

export const metadata: Metadata = {
  title: { default: "Portal de planners", template: "%s · Portal de planners" },
  robots: { index: false },
};

async function Who() {
  const ctx = await plannerContext();
  return (
    <div className="text-brand-sand/80 flex items-center gap-2 text-xs">
      <span className="hidden sm:inline">{ctx.plannerName}</span>
      <form action={signOut}>
        <Button
          size="sm"
          variant="ghost"
          className="text-brand-sand hover:text-brand-sand hover:bg-white/10"
        >
          <LogOut aria-hidden /> Salir
        </Button>
      </form>
    </div>
  );
}

export default function PortalLayout({ children }: LayoutProps<"/planners/portal">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-brand-green text-brand-sand">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Isotipo tone="light" className="size-8" />
              <div className="leading-tight">
                <p className="font-display text-sm tracking-[0.12em] uppercase">Oasis Pachacámac</p>
                <p className="text-brand-sand/70 text-[11px]">Portal de planners</p>
              </div>
            </div>
            <Suspense fallback={null}>
              <Who />
            </Suspense>
          </div>
          <Suspense fallback={<div className="h-9" />}>
            <PortalNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
