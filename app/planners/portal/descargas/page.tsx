import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Images, Tags } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Descargas" };

const ITEMS = [
  {
    href: "/planners/portal/ficha-tecnica",
    icon: FileText,
    title: "Ficha técnica",
    text: "Espacios, aforos, horarios y reglas del local. Imprime o guarda como PDF.",
  },
  {
    href: "/planners/portal/tarifario",
    icon: Tags,
    title: "Tarifario de planner",
    text: "Precios vigentes por tipo de evento, día y temporada, con tu comisión.",
  },
];

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Descargas</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {ITEMS.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group">
            <Card className="group-hover:border-brand-olive h-full">
              <CardHeader>
                <Icon className="text-brand-olive size-6" aria-hidden />
                <CardTitle className="mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{text}</CardContent>
            </Card>
          </Link>
        ))}
        <Card className="border-dashed">
          <CardHeader>
            <Images className="text-muted-foreground size-6" aria-hidden />
            <CardTitle className="mt-2">Fotos del local</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Pendiente: se publicarán al terminar la remodelación.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
