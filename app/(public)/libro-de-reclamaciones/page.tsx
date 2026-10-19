import type { Metadata } from "next";
import { ComplaintForm } from "@/components/public/simple-forms";
import { venueInfo } from "@/server/public/venue-info";

export const metadata: Metadata = {
  title: "Libro de Reclamaciones",
  description:
    "Libro de Reclamaciones virtual de Oasis Pachacámac (SAWA – Gestión Comercial S.A.C.).",
  alternates: { canonical: "/libro-de-reclamaciones" },
};

export default async function ComplaintsPage() {
  const info = await venueInfo();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl">Libro de Reclamaciones</h1>
      <dl className="bg-card mt-4 grid gap-1 rounded-xl border p-4 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Proveedor:</dt>
          <dd>SAWA – Gestión Comercial S.A.C.</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">RUC:</dt>
          <dd>{info.ruc ?? "[COMPLETAR]"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Domicilio:</dt>
          <dd>{info.companyAddress ?? "[COMPLETAR]"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">Establecimiento:</dt>
          <dd>Oasis Pachacámac, {info.address ?? "Pachacámac, Lima"}</dd>
        </div>
      </dl>
      <p className="text-muted-foreground mt-4 text-sm">
        Conforme al Código de Protección y Defensa del Consumidor, este establecimiento cuenta con
        un Libro de Reclamaciones virtual. La formulación del reclamo no impide acudir a otras vías
        de solución de controversias ni es requisito previo para interponer una denuncia ante el
        Indecopi. Responderemos en el plazo legal
        <span className="text-xs"> [plazo por validar con asesoría legal]</span>.
      </p>
      <div className="mt-8">
        <ComplaintForm />
      </div>
    </div>
  );
}
