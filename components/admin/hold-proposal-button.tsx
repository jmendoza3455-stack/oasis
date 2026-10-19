"use client";

import { useActionState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmHoldProposal, type HoldResult } from "@/app/admin/agentes/actions";

export function HoldProposalButton({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState<HoldResult, FormData>(confirmHoldProposal, null);
  return (
    <form
      action={action}
      aria-label={`Confirmar: ${title}`}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" disabled={pending}>
        <CalendarPlus aria-hidden /> Crear pre-reserva (72 h)
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
