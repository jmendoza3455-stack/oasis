"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Gauge, KanbanSquare, Settings, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/admin/crm", label: "CRM", icon: KanbanSquare },
  { href: "/admin/planners", label: "Planners", icon: Users },
  { href: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/admin/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/admin/avisos", label: "Avisos", icon: Bell },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Back-office" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-brand-sand/80 hover:text-brand-sand flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10",
              active && "text-brand-sand bg-white/15 font-medium",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
