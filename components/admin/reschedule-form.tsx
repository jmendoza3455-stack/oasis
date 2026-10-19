"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rescheduleBooking, type RescheduleResult } from "@/app/admin/reservas/[id]/actions";

export function RescheduleForm({
  bookingId,
  minDate,
  note,
}: {
  bookingId: string;
  minDate: string;
  note: string;
}) {
  const [state, action, pending] = useActionState<RescheduleResult, FormData>(
    rescheduleBooking,
    null,
  );
  return (
    <form action={action} aria-label="Reprogramar" className="grid gap-2 text-sm">
      <input type="hidden" name="id" value={bookingId} />
      <p className="text-muted-foreground text-xs">{note}</p>
      <div className="grid gap-1">
        <Label htmlFor="r-date">Nueva fecha</Label>
        <Input id="r-date" name="newDate" type="date" min={minDate} required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="r-reason">Motivo</Label>
        <Input id="r-reason" name="reason" maxLength={300} required />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Reprogramar
      </Button>
      {state && (
        <p
          role="status"
          className={state.ok ? "text-brand-olive dark:text-brand-camel" : "text-destructive"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
