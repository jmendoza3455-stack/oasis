"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  if (ms <= 0) return "Vencida";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** Cuenta regresiva de la pre-reserva (se actualiza cada 30 s). */
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const end = new Date(expiresAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (now === null) return <span className="text-muted-foreground">…</span>;
  const left = end - now;
  return (
    <span
      className={left < 12 * 3_600_000 ? "text-destructive font-medium" : "font-medium"}
      aria-label={`Vence en ${format(left)}`}
    >
      {format(left)}
    </span>
  );
}
