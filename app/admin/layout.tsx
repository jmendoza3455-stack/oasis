import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Isotipo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/nav";
import { VenueSwitcher } from "@/components/admin/venue-switcher";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/session";
import { signOut } from "@/app/ingresar/actions";
import { staffVenue, staffVenues } from "@/server/venue";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s · Back-office Oasis" },
  robots: { index: false },
};

async function Nav() {
  const user = await requireStaff();
  return <AdminNav admin={user.role === "admin"} />;
}

async function CurrentVenue() {
  const user = await requireStaff();
  const [venues, current] = await Promise.all([staffVenues(user.id), staffVenue(user.id)]);
  return (
    <VenueSwitcher
      venues={venues.map((v) => ({ slug: v.slug, name: v.name }))}
      current={current.slug}
    />
  );
}

async function UserBox() {
  const user = await requireStaff();
  return (
    <div className="text-brand-sand/80 flex items-center justify-between gap-2 text-xs md:flex-col md:items-start">
      <span className="truncate">
        {user.email} · {user.role === "admin" ? "Admin" : "Operaciones"}
      </span>
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

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-brand-green text-brand-sand flex shrink-0 flex-col gap-4 p-3 md:w-56 md:p-4">
        <div className="flex items-center gap-2">
          <Isotipo tone="light" className="size-8" />
          <div className="min-w-0 flex-1 leading-tight">
            <Suspense fallback={<div className="h-5" />}>
              <CurrentVenue />
            </Suspense>
            <p className="text-brand-sand/80 text-[11px]">Back-office</p>
          </div>
        </div>
        <Suspense fallback={<div className="h-9 md:h-48" />}>
          <Nav />
        </Suspense>
        <div className="md:mt-auto">
          <Suspense fallback={null}>
            <UserBox />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
