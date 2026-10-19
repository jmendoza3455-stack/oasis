import { cn } from "@/lib/utils";

// Arte decorativo de marca (palmera y ondas del isotipo) mientras no haya fotos reales.
// No simula fotos ni datos: es ilustración, aria-hidden.
const TONES = {
  green: { bg: "#2e3b2b", fg: "#c9a46c", wave: "#8a9aa3" },
  olive: { bg: "#7a7a45", fg: "#e6dccb", wave: "#2e3b2b" },
  camel: { bg: "#c9a46c", fg: "#2e3b2b", wave: "#f7f5f0" },
  slate: { bg: "#8a9aa3", fg: "#f7f5f0", wave: "#2e3b2b" },
} as const;

export function BrandArt({
  tone = "green",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: t.bg }}>
      <svg
        aria-hidden
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <g fill="none" stroke={t.wave} strokeWidth="3" strokeLinecap="round" opacity="0.55">
          {[210, 232, 254, 276].map((y, i) => (
            <path
              key={y}
              d={`M-20 ${y} q 30 -14 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0`}
              opacity={1 - i * 0.2}
            />
          ))}
        </g>
        <g transform="translate(300 60)" fill={t.fg} opacity="0.9">
          <rect x="-3" y="20" width="6" height="120" rx="3" />
          <path d="M0 22 C -20 0, -55 4, -70 22 C -45 14, -20 18, 0 28 Z" />
          <path d="M0 22 C 20 0, 55 4, 70 22 C 45 14, 20 18, 0 28 Z" />
          <path d="M0 20 C -10 -8, -30 -18, -48 -12 C -26 -6, -12 6, 0 26 Z" />
          <path d="M0 20 C 10 -8, 30 -18, 48 -12 C 26 -6, 12 6, 0 26 Z" />
        </g>
      </svg>
      {children && <div className="relative">{children}</div>}
    </div>
  );
}
