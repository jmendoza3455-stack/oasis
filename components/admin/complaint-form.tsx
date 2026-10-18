"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { respondComplaint, type ComplaintResult } from "@/app/admin/reclamos/actions";

export function ComplaintResponseForm({ id, code }: { id: string; code: string }) {
  const [state, action, pending] = useActionState<ComplaintResult | null, FormData>(
    respondComplaint,
    null,
  );
  return (
    <form action={action} aria-label={`Responder ${code}`} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <Textarea name="response" rows={4} aria-label="Respuesta al consumidor" required />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          Registrar respuesta
        </Button>
        {state && (
          <p
            role="status"
            className={`text-sm ${state.ok ? "text-brand-olive" : "text-destructive"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
