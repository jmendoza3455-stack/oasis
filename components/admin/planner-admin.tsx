"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invitePlanner, rejectApplication, setPlannerStatus } from "@/app/admin/planners/actions";

export function InvitePlannerForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      aria-label="Invitar planner"
      className="grid gap-3 sm:grid-cols-2"
      action={(fd) =>
        start(async () => {
          const res = await invitePlanner({
            businessName: String(fd.get("businessName")),
            contactName: String(fd.get("contactName")),
            email: String(fd.get("email")),
            phone: String(fd.get("phone") ?? ""),
          });
          setMsg(
            res.ok ? { ok: true, text: res.message ?? "Listo" } : { ok: false, text: res.error },
          );
        })
      }
    >
      <div className="grid gap-1">
        <Label htmlFor="i-business">Marca o empresa</Label>
        <Input id="i-business" name="businessName" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="i-contact">Contacto</Label>
        <Input id="i-contact" name="contactName" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="i-email">Correo</Label>
        <Input id="i-email" name="email" type="email" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="i-phone">Celular</Label>
        <Input id="i-phone" name="phone" type="tel" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Invitando…" : "Invitar al portal"}
        </Button>
        {msg && (
          <span className={msg.ok ? "text-brand-olive text-sm" : "text-destructive text-sm"}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

export function ApplicationActions(props: {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await invitePlanner({ ...props, applicationId: props.id });
            setError(res.ok ? null : res.error);
          })
        }
      >
        Invitar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => start(async () => void (await rejectApplication(props.id)))}
      >
        Descartar
      </Button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}

export function PlannerStatusToggle({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const next = status === "suspended" ? "active" : "suspended";
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(async () => void (await setPlannerStatus(id, next)))}
    >
      {status === "suspended" ? "Reactivar" : "Suspender"}
    </Button>
  );
}
