import { Button } from "@/components/ui/button";

// Home provisional de la fase 1. La web pública real llega en feat/web-publica.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-24">
      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
        Pachacámac · Lima
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">El Oasis</h1>
      <p className="text-muted-foreground max-w-prose text-lg">
        Casa de campo para bodas, eventos corporativos y full days con piscina. Estamos preparando
        la reapertura.
      </p>
      <div>
        <Button size="lg" disabled>
          Consulta de disponibilidad · muy pronto
        </Button>
      </div>
    </main>
  );
}
