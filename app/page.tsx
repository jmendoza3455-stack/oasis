import { Isotipo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

// Home provisional. La web pública real llega en feat/web-publica.
export default function Home() {
  return (
    <main className="bg-brand-green text-brand-sand flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Isotipo tone="light" className="size-20" />
      <h1 className="font-display mt-6 text-4xl leading-tight tracking-[0.14em] uppercase sm:text-5xl">
        Oasis
        <br />
        Pachacámac
      </h1>
      <div className="my-5 flex w-64 items-center gap-3" aria-hidden="true">
        <span className="bg-brand-sand/50 h-px flex-1" />
        <span className="bg-brand-sand size-1.5 rotate-45" />
        <span className="bg-brand-sand/50 h-px flex-1" />
      </div>
      <p className="text-base tracking-wide">
        Un espacio <strong className="font-semibold">sawa</strong>
      </p>
      <p className="text-brand-sand/85 mt-8 max-w-prose text-lg">
        Casa de campo para bodas, eventos corporativos y full days con piscina. Estamos preparando
        la reapertura.
      </p>
      <Button size="lg" variant="secondary" className="mt-8" disabled>
        Consulta de disponibilidad · muy pronto
      </Button>
    </main>
  );
}
