import { cn } from "@/lib/utils";

/** Placeholder MARCADO hasta tener fotos reales (OASIS.md §3: no inventar). */
export function PhotoPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Foto pendiente: ${label}`}
      className={cn(
        "relative flex items-end overflow-hidden rounded-xl bg-[repeating-linear-gradient(135deg,#3f5139_0_14px,#394a33_14px_28px)] p-3",
        className,
      )}
    >
      <span className="text-brand-sand rounded-md bg-black/45 px-2 py-1 text-xs">
        Foto pendiente · {label}
      </span>
    </div>
  );
}
