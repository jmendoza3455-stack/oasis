"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/planners/portal", label: "Disponibilidad" },
  { href: "/planners/portal/clientes", label: "Mis clientes" },
  { href: "/planners/portal/reservas", label: "Mis reservas" },
  { href: "/planners/portal/comisiones", label: "Comisiones" },
  { href: "/planners/portal/descargas", label: "Descargas" },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Portal de planners" className="flex gap-1 overflow-x-auto">
      {items.map((i) => {
        const active =
          i.href === "/planners/portal" ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-brand-sand/80 shrink-0 rounded-md px-3 py-2 text-sm hover:bg-white/10",
              active && "text-brand-sand bg-white/15 font-medium",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
