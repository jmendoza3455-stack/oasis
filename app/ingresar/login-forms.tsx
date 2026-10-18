"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, signInWithPassword, type LoginState } from "./actions";

export function LoginForms() {
  const [pwState, pwAction, pwPending] = useActionState<LoginState, FormData>(
    signInWithPassword,
    {},
  );
  const [mlState, mlAction, mlPending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  return (
    <div className="grid gap-8">
      <form action={pwAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {pwState.error && (
          <p role="alert" className="text-destructive text-sm">
            {pwState.error}
          </p>
        )}
        <Button type="submit" disabled={pwPending}>
          {pwPending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <form action={mlAction} className="grid gap-3 border-t pt-6">
        <Label htmlFor="ml-email">¿Prefieres un enlace por correo?</Label>
        <Input id="ml-email" name="email" type="email" autoComplete="email" required />
        {mlState.error && (
          <p role="alert" className="text-destructive text-sm">
            {mlState.error}
          </p>
        )}
        {mlState.sent && (
          <p role="status" className="text-muted-foreground text-sm">
            Si el correo está registrado, te llegará un enlace para ingresar.
          </p>
        )}
        <Button type="submit" variant="outline" disabled={mlPending}>
          {mlPending ? "Enviando…" : "Enviarme un enlace"}
        </Button>
      </form>
    </div>
  );
}
