"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { submitVoucher, type PortalResult } from "@/app/planners/portal/actions";

export function VoucherForm({ bookingId, today }: { bookingId: string; today: string }) {
  const [state, action, pending] = useActionState<PortalResult | null, FormData>(
    submitVoucher,
    null,
  );
  if (state?.ok)
    return (
      <p role="status" className="text-brand-olive dark:text-brand-camel text-sm">
        Voucher enviado. El equipo lo valida y verás el cambio de estado de la reserva.
      </p>
    );
  return (
    <details className="w-full text-sm">
      <summary className="cursor-pointer font-medium">Enviar voucher de pago</summary>
      <form action={action} aria-label="Enviar voucher" className="mt-3 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="bookingId" value={bookingId} />
        <div className="grid gap-1">
          <Label htmlFor={`v-kind-${bookingId}`}>Concepto</Label>
          <NativeSelect id={`v-kind-${bookingId}`} name="kind" defaultValue="deposit">
            <option value="deposit">Adelanto</option>
            <option value="balance">Saldo</option>
            <option value="guarantee">Garantía</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`v-amount-${bookingId}`}>Monto S/</Label>
          <Input
            id={`v-amount-${bookingId}`}
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`v-method-${bookingId}`}>Medio</Label>
          <NativeSelect id={`v-method-${bookingId}`} name="method" defaultValue="transfer">
            <option value="transfer">Transferencia</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`v-op-${bookingId}`}>N.º de operación</Label>
          <Input id={`v-op-${bookingId}`} name="operationCode" maxLength={60} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`v-date-${bookingId}`}>Fecha de pago</Label>
          <Input
            id={`v-date-${bookingId}`}
            name="paidOn"
            type="date"
            max={today}
            defaultValue={today}
            required
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`v-file-${bookingId}`}>Voucher (imagen o PDF)</Label>
          <Input
            id={`v-file-${bookingId}`}
            name="voucher"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            required
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-3">
          <Button type="submit" size="sm" disabled={pending}>
            Enviar voucher
          </Button>
          {state && !state.ok && (
            <p role="alert" className="text-destructive">
              {state.error}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
