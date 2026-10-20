import { cn } from "@/lib/utils";

/** auto: sigue el modo claro/oscuro del sistema; dark/light: fijo sobre fondo claro/oscuro. */
type Tone = "auto" | "dark" | "light";

const palette: Record<Tone, { frond: string; trunk: string; text: string }> = {
  auto: { frond: "currentColor", trunk: "currentColor", text: "text-[var(--logo-ink)]" },
  dark: { frond: "#374031", trunk: "#374031", text: "text-brand-green" },
  light: { frond: "#DFD0BF", trunk: "#DFD0BF", text: "text-brand-sand" },
};

export function Isotipo({ tone = "auto", className }: { tone?: Tone; className?: string }) {
  const c = palette[tone];
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className={cn(tone === "auto" && c.text, className)}
    >
      <path d="M48 70C48 50 48 38 48 26" stroke={c.trunk} strokeWidth="3" strokeLinecap="round" />
      <path d="M48 30C38 18 24 18 16 26c12-2 22 0 32 8Z" fill={c.frond} />
      <path d="M48 30c10-12 24-12 32-4-12-2-22 0-32 8Z" fill={c.frond} />
      <path d="M48 32c-8-6-18-2-24 8 10-6 18-6 24-2Z" fill="#C3A075" />
      <path d="M48 32c8-6 18-2 24 8-10-6-18-6-24-2Z" fill="#C3A075" />
      <path d="M22 78q9-6 18 0t18 0 18 0" stroke="#768689" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * "sawa" en texto mientras no esté el arte maestro vectorial del logo (OASIS.md §15.5): la cinta de
 * la W nunca se redibuja ni se recolorea.
 */
export function SawaWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-sans font-semibold tracking-[0.02em] lowercase", className)}>
      sawa
    </span>
  );
}

/** Respaldo de marca del manual SAWA: "Un espacio sawa". */
export function Endorsement({ className }: { className?: string }) {
  return (
    <span className={cn("font-display", className)}>
      Un espacio <SawaWordmark />
    </span>
  );
}

/** Logotipo horizontal: isotipo + "OASIS PACHACÁMAC" + respaldo "Un espacio sawa". */
export function LogoHorizontal({ tone = "auto", className }: { tone?: Tone; className?: string }) {
  const c = palette[tone];
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Isotipo tone={tone} className="size-10 shrink-0" />
      <span className={cn("flex flex-col leading-none", c.text)}>
        <span className="font-display text-xl tracking-[0.12em] uppercase">Oasis Pachacámac</span>
        <Endorsement className="mt-1 text-xs opacity-80" />
      </span>
    </span>
  );
}

/**
 * Sello del local según el manual SAWA (aplicación "Oasis Pachacámac"): nombre en dos líneas,
 * filete con rombo y respaldo "Un espacio sawa".
 */
export function OasisLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-grid justify-items-center gap-2 text-center", className)}>
      <span className="font-display text-2xl leading-tight tracking-[0.18em] uppercase">
        Oasis
        <br />
        Pachacámac
      </span>
      <span aria-hidden className="flex w-full items-center gap-2 opacity-70">
        <span className="h-px flex-1 bg-current" />
        <span className="size-1.5 rotate-45 bg-current" />
        <span className="h-px flex-1 bg-current" />
      </span>
      <Endorsement className="text-base" />
    </span>
  );
}
