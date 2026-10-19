"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Gauge,
  KanbanSquare,
  Megaphone,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/admin/crm", label: "CRM", icon: KanbanSquare },
  { href: "/admin/planners", label: "Planners", icon: Users },
  { href: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/admin/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/admin/promociones", label: "Promociones", icon: BadgePercent },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/avisos", label: "Avisos", icon: Bell },
  { href: "/admin/agentes", label: "Agentes", icon: Bot },
  { href: "/admin/reclamos", label: "Reclamos", icon: BookOpen },
  { href: "/admin/equipo", label: "Equipo", icon: UserCog, adminOnly: true },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminNav({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Back-office" className="flex gap-1 overflow-x-auto md:flex-col">
      {items
        .filter((i) => admin || !("adminOnly" in i))
        .map(({ href, label, icon: Icon }) => {
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
