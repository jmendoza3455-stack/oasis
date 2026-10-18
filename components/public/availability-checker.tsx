"use client";

import { useState, useTransition } from "react";
import { CalendarCheck2, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/domain";
import { track } from "@/lib/tracking";
import { checkAvailability } from "@/server/public/actions";

export function AvailabilityChecker({ onAvailable }: { onAvailable?: (date: string) => void }) {
  const [date, setDate] = useState("");
  const [result, setResult] = useState<{ date: string; available: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await checkAvailability(date);
      if (!res.ok) return setError(res.error);
      setResult({ date, available: res.available });
      track("availability_check", { date, available: res.available ? 1 : 0 });
      if (res.available) onAvailable?.(date);
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3" aria-label="Consultar disponibilidad">
      <div className="grid gap-2">
        <Label htmlFor="availability-date">¿Qué fecha tienes en mente?</Label>
        <div className="flex gap-2">
          <Input
            id="availability-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button type="submit" disabled={pending || !date}>
            {pending ? "Consultando…" : "Consultar"}
          </Button>
        </div>
      </div>
      <div aria-live="polite" className="min-h-6 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {result &&
          (result.available ? (
            <p className="text-brand-green dark:text-brand-sand flex items-center gap-2 font-medium">
              <CalendarCheck2 className="size-4" aria-hidden /> El {formatDate(result.date)} está
              disponible.
            </p>
          ) : (
            <p className="text-muted-foreground flex items-center gap-2">
              <CalendarX2 className="size-4" aria-hidden /> El {formatDate(result.date)} no está
              disponible. Prueba otra fecha o escríbenos.
            </p>
          ))}
      </div>
    </form>
  );
}
