import type { Metadata } from "next";
import { Suspense } from "react";
import { CancelHoldButton } from "@/components/portal/cancel-hold";
import { HoldCountdown } from "@/components/portal/hold-countdown";
import { VoucherForm } from "@/components/portal/voucher-form";
import { Badge } from "@/components/ui/badge";
import { formatDate, STATUS_LABEL } from "@/lib/domain";
import { EVENT_TYPE_LABEL, STATUS_COLOR } from "@/lib/ui/status";
import { activePlannerContext, plannerBookings } from "@/server/queries/planner";

export const metadata: Metadata = { title: "Mis reservas" };

async function Bookings() {
  const ctx = await activePlannerContext();
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(now);
  const rows = (await plannerBookings(ctx)).filter(
    (b) => !(b.status === "prebooked" && b.holdExpiresAt && new Date(b.holdExpiresAt) <= now),
  );
  if (rows.length === 0)
    return <p className="text-muted-foreground text-sm">Aún no tienes reservas.</p>;
  return (
    <ul className="grid gap-3">
      {rows.map((b) => (
        <li
          key={b.id}
          className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        >
          <div>
            <p className="font-medium">
              {formatDate(b.eventDate)} · {EVENT_TYPE_LABEL[b.eventType]} · {b.guests} invitados
            </p>
            <p className="text-muted-foreground text-sm">{b.clientName ?? "Sin cliente"}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Badge
              style={{ background: STATUS_COLOR[b.status].bg, color: STATUS_COLOR[b.status].fg }}
            >
              {STATUS_LABEL[b.status]}
            </Badge>
            {b.status === "prebooked" && b.holdExpiresAt && (
              <>
                <span>
                  Vence en <HoldCountdown expiresAt={b.holdExpiresAt} />
                </span>
                <CancelHoldButton bookingId={b.id} />
              </>
            )}
          </div>
          {["prebooked", "reserved", "confirmed"].includes(b.status) && (
            <VoucherForm bookingId={b.id} today={today} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Mis reservas</h1>
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Bookings />
      </Suspense>
    </div>
  );
}
