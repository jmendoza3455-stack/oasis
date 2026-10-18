"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { markWhatsappSent, runJobNow, type RunResult } from "@/app/admin/avisos/actions";

export function RunJobForm() {
  const [state, action, pending] = useActionState<RunResult | null, FormData>(runJobNow, null);
  return (
    <form action={action} aria-label="Ejecutar proceso" className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <NativeSelect name="job" aria-label="Proceso" defaultValue="diario" className="w-64">
          <option value="diario">Avisos del día (saldos, D-7, D-1)</option>
          <option value="sla">Alerta de leads sin respuesta</option>
          <option value="semanal">Resumen semanal a socios</option>
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Ejecutando…" : "Ejecutar ahora"}
        </Button>
      </div>
      {state && (
        <p
          role="status"
          className={`text-sm ${state.ok ? "text-brand-olive" : "text-destructive"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function MarkSentButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(() => markWhatsappSent(id))}
    >
      Marcar enviado
    </Button>
  );
}
