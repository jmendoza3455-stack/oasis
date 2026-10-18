"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABEL, type BookingStatus } from "@/lib/domain";
import { transitionBooking } from "@/app/admin/reservas/[id]/actions";

type Option = { to: BookingStatus; blockedReason: string | null };

const VERB: Partial<Record<BookingStatus, string>> = {
  reserved: "Marcar como Separada",
  confirmed: "Marcar como Confirmada",
  done: "Marcar como Realizada",
  settled: "Liquidar",
  cancelled: "Cancelar reserva",
};

export function TransitionActions({
  bookingId,
  options,
}: {
  bookingId: string;
  options: Option[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = (to: BookingStatus) =>
    start(async () => {
      setError(null);
      const res = await transitionBooking({ id: bookingId, to: to as "reserved", reason });
      if (!res.ok) setError(res.error);
      else setConfirmCancel(false);
    });

  if (options.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Esta reserva ya no admite cambios de estado.</p>
    );
  }

  return (
    <div className="grid gap-3">
      {options
        .filter((o) => o.to !== "cancelled")
        .map((o) => (
          <div key={o.to} className="grid gap-1">
            <Button onClick={() => run(o.to)} disabled={pending || o.blockedReason !== null}>
              {VERB[o.to] ?? STATUS_LABEL[o.to]}
            </Button>
            {o.blockedReason && <p className="text-muted-foreground text-xs">{o.blockedReason}</p>}
          </div>
        ))}
      {options.some((o) => o.to === "cancelled") &&
        (confirmCancel ? (
          <div className="border-destructive/40 grid gap-2 rounded-md border p-3">
            <label htmlFor="cancel-reason" className="text-sm font-medium">
              Motivo de la cancelación
            </label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Obligatorio. Se aplica la política de cancelación."
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={pending || !reason.trim()}
                onClick={() => run("cancelled")}
              >
                Confirmar cancelación
              </Button>
              <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={pending}>
            {VERB.cancelled}
          </Button>
        ))}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
