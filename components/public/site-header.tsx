import Link from "next/link";
import { Menu } from "lucide-react";
import { LogoHorizontal } from "@/components/brand/logo";
import { SEGMENTS } from "@/lib/content/segments";

const links = [
  ...SEGMENTS.map((s) => ({ href: `/${s.slug}`, label: s.nav })),
  { href: "/planners", label: "Planners" },
];

export function SiteHeader() {
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/">
          <LogoHorizontal />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
          <Link
            href="/#cotizar"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 font-medium"
          >
            Cotizar
          </Link>
        </nav>
        <details className="relative md:hidden">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border">
            <Menu className="size-5" aria-hidden />
            <span className="sr-only">Menú</span>
          </summary>
          <nav
            aria-label="Principal móvil"
            className="bg-card absolute right-0 mt-2 grid w-52 gap-1 rounded-xl border p-2 shadow-lg"
          >
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:bg-muted rounded-md px-3 py-2">
                {l.label}
              </Link>
            ))}
            <Link
              href="/#cotizar"
              className="bg-primary text-primary-foreground rounded-md px-3 py-2"
            >
              Cotizar
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
