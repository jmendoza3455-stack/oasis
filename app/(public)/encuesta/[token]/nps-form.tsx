"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitNps, type NpsState } from "./actions";

export function NpsForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<NpsState, FormData>(submitNps, {});
  if (state.ok)
    return (
      <div role="status" className="bg-secondary grid gap-3 rounded-xl p-5">
        <p>¡Gracias por tu opinión! Nos ayuda a mejorar.</p>
        {state.reviewUrl && (
          <p>
            ¿Nos ayudas con una reseña en Google? Le sirve a otras familias y empresas a
            encontrarnos.{" "}
            <a
              href={state.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Dejar una reseña
            </a>
          </p>
        )}
      </div>
    );
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="token" value={token} />
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-medium">
          Del 0 al 10, ¿qué tan probable es que recomiendes Oasis Pachacámac?
        </legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, n) => (
            <label
              key={n}
              className="has-checked:bg-primary has-checked:text-primary-foreground flex cursor-pointer flex-col items-center gap-1 rounded-md border p-2"
            >
              <input type="radio" name="score" value={n} className="sr-only" required />
              <span className="font-medium">{n}</span>
            </label>
          ))}
        </div>
        <p className="text-muted-foreground flex justify-between text-xs">
          <span>Nada probable</span>
          <span>Muy probable</span>
        </p>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="comment">¿Qué podríamos mejorar? (opcional)</Label>
        <Textarea id="comment" name="comment" rows={3} />
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        Enviar
      </Button>
    </form>
  );
}
