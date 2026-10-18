import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { Isotipo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="bg-brand-green text-brand-sand mt-auto">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <Isotipo tone="light" className="size-10" />
            <div>
              <p className="font-display tracking-[0.12em] uppercase">Oasis Pachacámac</p>
              <p className="text-brand-sand/80 text-xs">
                Un espacio <strong>sawa</strong>
              </p>
            </div>
          </div>
          <p className="text-brand-sand/80 text-sm">
            Casa de campo para eventos en Pachacámac, Lima.
          </p>
        </div>
        <nav aria-label="Enlaces" className="grid content-start gap-2 text-sm">
          <Link href="/bodas" className="hover:underline">
            Bodas
          </Link>
          <Link href="/corporativo" className="hover:underline">
            Empresas
          </Link>
          <Link href="/full-day" className="hover:underline">
            Full day familiar
          </Link>
          <Link href="/planners" className="hover:underline">
            Programa de planners
          </Link>
          <Link href="/ingresar" className="hover:underline">
            Ingresar
          </Link>
        </nav>
        <div className="grid content-start gap-3 text-sm">
          <Link
            href="/libro-de-reclamaciones"
            className="border-brand-sand/40 flex w-fit items-center gap-2 rounded-md border px-3 py-2 hover:bg-white/10"
          >
            <BookOpenText className="size-4" aria-hidden /> Libro de Reclamaciones
          </Link>
          <Link href="/privacidad" className="hover:underline">
            Aviso de privacidad y cookies
          </Link>
          <p className="text-brand-sand/70 text-xs">
            SAWA – Gestión Comercial S.A.C. · RUC [COMPLETAR]
          </p>
        </div>
      </div>
    </footer>
  );
}
