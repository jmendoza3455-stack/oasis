import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { TransitionActions } from "@/components/admin/transition-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import {
  checkTransition,
  formatDate,
  formatPEN,
  STATUS_LABEL,
  TRANSITION_ERROR_MESSAGE,
  TRANSITIONS,
} from "@/lib/domain";
import { CHANNEL_LABEL, EVENT_TYPE_LABEL, STATUS_COLOR } from "@/lib/ui/status";
import { bookingDetail } from "@/server/queries/booking";

export const metadata: Metadata = { title: "Reserva" };

const PAYMENT_KIND = {
  deposit: "Adelanto",
  balance: "Saldo",
  guarantee: "Garantía",
  other: "Otro",
} as const;
const PAYMENT_STATUS = {
  pending: "Por validar",
  validated: "Validado",
  rejected: "Rechazado",
} as const;
const dateTime = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "short",
  timeStyle: "short",
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

async function Detail({ params }: { params: PageProps<"/admin/reservas/[id]">["params"] }) {
  const user = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await bookingDetail(user.id, id);
  if (!b) notFound();

  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(now);
  const options = TRANSITIONS[b.status]
    .filter((to) => to !== "expired")
    .map((to) => {
      const check = checkTransition(b.status, to, {
        role: user.role === "admin" ? "admin" : "ops",
        now,
        holdExpiresAt: b.holdExpiresAt ? new Date(b.holdExpiresAt) : null,
        eventHasHappened: b.eventDate <= today,
        depositAmount: b.depositAmount,
        rentalGross: b.rentalGross,
        paidValidated: b.paidValidated,
        contractSigned: b.contractSignedAt !== null,
        guaranteeResolved: !b.guaranteeStatus || !["pending", "held"].includes(b.guaranteeStatus),
        hasPlanner: b.plannerId !== null,
        commissionPaid: b.commissionStatus === "paid",
        reason: to === "cancelled" ? "pendiente" : undefined,
      });
      return { to, blockedReason: check.ok ? null : TRANSITION_ERROR_MESSAGE[check.error] };
    })
    .filter((o) => o.blockedReason !== TRANSITION_ERROR_MESSAGE.forbidden || o.to !== "cancelled");

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">
          {EVENT_TYPE_LABEL[b.eventType]} · {formatDate(b.eventDate)}
        </h1>
        <Badge style={{ background: STATUS_COLOR[b.status].bg, color: STATUS_COLOR[b.status].fg }}>
          {STATUS_LABEL[b.status]}
        </Badge>
        <Badge variant="outline">{CHANNEL_LABEL[b.channel]}</Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Evento y cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Row label="Cliente" value={b.client.name ?? "—"} />
              <Row label="Teléfono" value={b.client.phone ?? "—"} />
              <Row label="Correo" value={b.client.email ?? "—"} />
              {b.client.ruc && <Row label="RUC" value={b.client.ruc} />}
              <Row label="Invitados" value={b.guests} />
              <Row label="Pernocte" value={b.overnight ? "Sí" : "No"} />
              {b.plannerName && <Row label="Planner" value={b.plannerName} />}
              {b.status === "prebooked" && b.holdExpiresAt && (
                <Row label="Pre-reserva vence" value={dateTime.format(new Date(b.holdExpiresAt))} />
              )}
              {b.cancelReason && <Row label="Motivo de cancelación" value={b.cancelReason} />}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Montos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Row label="Alquiler de lista (sin IGV)" value={formatPEN(b.rentalListNet)} />
              {b.discountPct > 0 && <Row label="Descuento" value={`${b.discountPct} %`} />}
              <Row label="Alquiler sin IGV" value={formatPEN(b.rentalNet)} />
              <Row
                label={`IGV (${Math.round(b.igvRate * 100)} %)`}
                value={formatPEN(b.rentalIgv)}
              />
              <Row label="Total con IGV" value={formatPEN(b.rentalGross)} />
              <Row label="Adelanto requerido" value={formatPEN(b.depositAmount)} />
              <Row label="Cobrado (validado)" value={formatPEN(b.paidValidated)} />
              <Row label="Saldo vence" value={b.balanceDueOn ? formatDate(b.balanceDueOn) : "—"} />
              <Row label="Garantía" value={formatPEN(b.guaranteeAmount)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <TransitionActions bookingId={b.id} options={options} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            {b.payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin pagos registrados.</p>
            ) : (
              <ul className="divide-y text-sm">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex justify-between py-2">
                    <span>
                      {PAYMENT_KIND[p.kind as keyof typeof PAYMENT_KIND]} · {formatDate(p.paidOn)} ·{" "}
                      {p.method}
                    </span>
                    <span className="font-medium">
                      {formatPEN(p.amount)}{" "}
                      <span className="text-muted-foreground">
                        ({PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS]})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            {b.history.length === 0 ? (
              <p className="text-muted-foreground text-sm">Visible solo para administradores.</p>
            ) : (
              <ol className="grid gap-2 text-sm">
                {b.history.map((h, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span>
                      {h.from
                        ? `${STATUS_LABEL[h.from as keyof typeof STATUS_LABEL]} → ${STATUS_LABEL[h.to as keyof typeof STATUS_LABEL]}`
                        : `Creada como ${STATUS_LABEL[h.to as keyof typeof STATUS_LABEL]}`}
                    </span>
                    <span className="text-muted-foreground">
                      {dateTime.format(new Date(h.at))} ·{" "}
                      {h.actorEmail ?? (h.actorType === "system" ? "Sistema" : h.actorType)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BookingPage(props: PageProps<"/admin/reservas/[id]">) {
  return (
    <div className="grid gap-4">
      <Link
        href="/admin/calendario"
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Calendario
      </Link>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Detail params={props.params} />
      </Suspense>
    </div>
  );
}
