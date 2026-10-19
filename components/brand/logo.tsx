import { cn } from "@/lib/utils";

/** auto: sigue el modo claro/oscuro del sistema; dark/light: fijo sobre fondo claro/oscuro. */
type Tone = "auto" | "dark" | "light";

const palette: Record<Tone, { frond: string; trunk: string; text: string; endorse: string }> = {
  auto: {
    frond: "currentColor",
    trunk: "currentColor",
    text: "text-[var(--logo-ink)]",
    endorse: "text-[var(--logo-endorse)]",
  },
  dark: { frond: "#2E3B2B", trunk: "#2E3B2B", text: "text-brand-green", endorse: "text-[#6F6F6F]" },
  light: {
    frond: "#E6DCCB",
    trunk: "#E6DCCB",
    text: "text-brand-sand",
    endorse: "text-brand-sand/80",
  },
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
      <path d="M48 32c-8-6-18-2-24 8 10-6 18-6 24-2Z" fill="#C9A46C" />
      <path d="M48 32c8-6 18-2 24 8-10-6-18-6-24-2Z" fill="#C9A46C" />
      <path d="M22 78q9-6 18 0t18 0 18 0" stroke="#8A9AA3" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Logotipo horizontal: isotipo + "OASIS PACHACÁMAC" + respaldo "Un espacio sawa". */
export function LogoHorizontal({ tone = "auto", className }: { tone?: Tone; className?: string }) {
  const c = palette[tone];
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Isotipo tone={tone} className="size-10 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-xl tracking-[0.12em] uppercase", c.text)}>
          Oasis Pachacámac
        </span>
        <span className={cn("mt-1 text-xs tracking-wide", c.endorse)}>
          Un espacio <strong className="font-semibold">sawa</strong>
        </span>
      </span>
    </span>
  );
}
