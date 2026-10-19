import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { brandInfo } from "@/server/brand-preview";

export const BASE = "/vista-previa";
const links = [
  { href: `${BASE}/experiencias`, label: "Experiencias" },
  { href: `${BASE}/locales`, label: "Locales" },
  { href: "/planners", label: "Planners" },
];

/** Nombre de la marca madre; mientras no esté definido se marca como provisional. */
export async function BrandName({ className = "" }: { className?: string }) {
  const brand = await brandInfo();
  return (
    <span className={`font-display tracking-[0.14em] uppercase ${className}`}>
      {brand.isPlaceholder ? "[Marca]" : brand.name}
    </span>
  );
}

export function BrandHeader({ name }: { name: React.ReactNode }) {
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={BASE} className="text-xl">
          {name}
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
          <Link
            href={`${BASE}/mi-cuenta`}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <UserRound className="size-4" aria-hidden /> Mi cuenta
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
            {[...links, { href: `${BASE}/mi-cuenta`, label: "Mi cuenta" }].map((l) => (
              <Link key={l.href} href={l.href} className="hover:bg-muted rounded-md px-3 py-2">
                {l.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

export function BrandFooter({ name }: { name: React.ReactNode }) {
  return (
    <footer className="bg-brand-green text-brand-sand mt-auto">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        <div className="grid content-start gap-2">
          <p className="text-lg">{name}</p>
          <p className="text-brand-sand/80 max-w-xs text-sm">
            Experiencias para celebrar fuera de la ciudad, en locales exclusivos.
          </p>
        </div>
        <nav aria-label="Pie" className="grid content-start gap-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="grid content-start gap-2 text-sm">
          <Link href="/libro-de-reclamaciones" className="hover:underline">
            Libro de Reclamaciones
          </Link>
          <Link href="/privacidad" className="hover:underline">
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
