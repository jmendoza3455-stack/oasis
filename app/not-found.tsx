import { CTA_LABEL } from "@/components/public/cta-link";
import Link from "next/link";
import { Isotipo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="bg-brand-green text-brand-sand grid min-h-dvh place-items-center px-4 py-16">
      <div className="grid max-w-lg justify-items-center gap-5 text-center">
        <Isotipo tone="light" className="size-16" />
        <p className="text-brand-camel text-sm tracking-[0.2em] uppercase">Error 404</p>
        <h1 className="font-display text-4xl">Esta página no existe</h1>
        <p className="text-brand-sand/80">
          Puede que el enlace haya cambiado. Te dejamos los caminos más usados:
        </p>
        <nav aria-label="Enlaces útiles" className="flex flex-wrap justify-center gap-3">
          <Link
            href="/#cotizar"
            className="bg-brand-camel rounded-md px-5 py-3 font-medium text-[#2a2418]"
          >
            {CTA_LABEL}
          </Link>
          <Link href="/" className="border-brand-sand/50 rounded-md border px-5 py-3">
            Ir al inicio
          </Link>
        </nav>
        <p className="text-brand-sand/70 text-sm">
          <Link href="/bodas" className="underline">
            Bodas
          </Link>{" "}
          ·{" "}
          <Link href="/corporativo" className="underline">
            Empresas
          </Link>{" "}
          ·{" "}
          <Link href="/full-day" className="underline">
            Full day
          </Link>{" "}
          ·{" "}
          <Link href="/planners" className="underline">
            Planners
          </Link>
        </p>
      </div>
    </main>
  );
}
