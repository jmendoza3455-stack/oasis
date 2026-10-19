"use client";

import Link from "next/link";

export const CTA_LABEL = "Ver fechas disponibles";

/**
 * Único llamado a la acción de la web. Si la página tiene su propia sección #cotizar (home y
 * landings) baja hasta ella; si no, lleva a la de la home. Sin usePathname: no fuerza render
 * dinámico.
 */
export function CtaLink({
  className,
  children = CTA_LABEL,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href="/#cotizar"
      className={className}
      onClick={(e) => {
        const target = document.getElementById("cotizar");
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#cotizar");
      }}
    >
      {children}
    </Link>
  );
}
