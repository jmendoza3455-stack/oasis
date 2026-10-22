import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BrandFooter,
  BrandHeader,
  BrandName,
  PUBLIC_BASE,
} from "@/components/brand-site/brand-header";

export const metadata: Metadata = {
  title: {
    default: "SAWA · gestión de espacios & experiencias",
    template: "%s · SAWA",
  },
  description:
    "Locales exclusivos para celebrar fuera de la ciudad: bodas, eventos de empresa y full days. Disponibilidad en vivo.",
  // Hasta definir el dominio de la marca (p. ej. espacios.sawa.com.pe) no se indexa en esta URL
  robots: { index: false, follow: true },
};

const name = (
  <Suspense fallback={<span className="text-3xl font-semibold">sawa</span>}>
    <BrandName />
  </Suspense>
);

export default function SawaLayout({ children }: LayoutProps<"/sawa">) {
  return (
    <>
      <BrandHeader name={name} base={PUBLIC_BASE} full={false} />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <BrandFooter name={name} base={PUBLIC_BASE} full={false} />
    </>
  );
}
