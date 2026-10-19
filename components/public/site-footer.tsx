import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { Isotipo } from "@/components/brand/logo";
import { venueInfo } from "@/server/public/venue-info";

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export async function SiteFooter() {
  const info = await venueInfo();
  const social = Object.entries(info.social).filter(([, url]) => url);
  return (
    <footer className="bg-brand-green text-brand-sand mt-auto pb-20 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div className="grid content-start gap-3 md:col-span-2">
          <div className="flex items-center gap-3">
            <Isotipo tone="light" className="size-10" />
            <p className="font-display tracking-[0.12em] uppercase">Oasis Pachacámac</p>
          </div>
          <p className="text-brand-sand/80 max-w-sm text-sm">
            Casa de campo para bodas, eventos de empresa y full days con piscina en{" "}
            {info.address ?? "Pachacámac, Lima"}.
          </p>
          {social.length > 0 && (
            <ul className="flex gap-4 text-sm">
              {social.map(([k, url]) => (
                <li key={k}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {SOCIAL_LABEL[k] ?? k}
                  </a>
                </li>
              ))}
            </ul>
          )}
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
          {info.pricesEnabled && (
            <Link href="/precios" className="hover:underline">
              Precios
            </Link>
          )}
          <Link href="/planners" className="hover:underline">
            Programa de planners
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
          <Link href="/ingresar" className="text-brand-sand/70 hover:underline">
            Acceso equipo y planners
          </Link>
          {info.legalName && (
            <p className="text-brand-sand/70 text-xs">
              {info.legalName}
              {info.ruc ? ` · RUC ${info.ruc}` : ""}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
