import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandFooter, BrandHeader, BrandName } from "@/components/brand-site/brand-header";
import { requirePreview } from "@/server/brand-preview";

export const metadata: Metadata = {
  title: { default: "Vista previa de la marca", template: "%s · Vista previa" },
  robots: { index: false, follow: false },
};

async function Gate({ children }: { children: React.ReactNode }) {
  await requirePreview();
  return children;
}

const name = (
  <Suspense fallback={<span className="font-display tracking-[0.14em] uppercase">[Marca]</span>}>
    <BrandName />
  </Suspense>
);

export default function PreviewLayout({ children }: LayoutProps<"/vista-previa">) {
  return (
    <>
      <p className="bg-brand-camel px-4 py-2 text-center text-sm text-[#2a2418]">
        <strong>Vista previa, no publicada.</strong> Nombre de la marca, experiencias y fotos por
        definir: todo lo marcado como ejemplo o pendiente se reemplaza con datos reales.
      </p>
      <BrandHeader name={name} />
      <main id="contenido" className="flex-1">
        <Suspense
          fallback={
            <div className="bg-muted mx-auto my-10 h-96 max-w-6xl animate-pulse rounded-2xl" />
          }
        >
          <Gate>{children}</Gate>
        </Suspense>
      </main>
      <BrandFooter name={name} />
    </>
  );
}
