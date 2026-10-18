import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ActivityForm, CreateBookingForm } from "@/components/admin/lead-forms";
import { LeadStageControl } from "@/components/admin/lead-stage-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { formatDate, STATUS_LABEL, type BookingStatus } from "@/lib/domain";
import { CHANNEL_LABEL, EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { leadDetail, STAGE_LABEL } from "@/server/queries/crm";

export const metadata: Metadata = { title: "Lead" };

const KIND = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  email: "Correo",
  visit: "Visita",
  note: "Nota",
  task: "Tarea",
} as Record<string, string>;
const dt = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "short",
  timeStyle: "short",
});

async function Detail({ params }: { params: PageProps<"/admin/crm/[id]">["params"] }) {
  const user = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const l = await leadDetail(user.id, id);
  if (!l) notFound();
  const activeBooking = l.bookings.find((b) => !["cancelled", "expired"].includes(b.status));

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">{l.clientName ?? "Lead"}</h1>
        <Badge>{STAGE_LABEL[l.stage]}</Badge>
        <Badge variant="outline">{CHANNEL_LABEL[l.channel]}</Badge>
        {l.plannerName && <Badge variant="secondary">{l.plannerName}</Badge>}
      </header>
      {l.attributionAlert && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-[#C2683F]/15 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {l.attributionAlert}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contacto y evento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <p>{l.phone ?? "—"}</p>
            <p>{l.email ?? "—"}</p>
            <p className="mt-2">
              {l.eventType ? EVENT_TYPE_LABEL[l.eventType] : "Tipo por definir"}
              {l.eventDate && ` · ${formatDate(l.eventDate)}`}
              {l.guests && ` · ${l.guests} invitados`}
            </p>
            {l.message && <p className="bg-muted mt-2 rounded-md p-2">{l.message}</p>}
            <p className="text-muted-foreground mt-2 text-xs">
              Ingresó {dt.format(new Date(l.createdAt))}
              {l.firstResponseAt && ` · 1.ª respuesta ${dt.format(new Date(l.firstResponseAt))}`}
            </p>
            {l.lostReason && (
              <p className="text-destructive text-xs">Motivo de pérdida: {l.lostReason}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Origen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {Object.entries(l.utm).filter(([, v]) => v).length === 0 ? (
              <p className="text-muted-foreground">Sin datos de campaña.</p>
            ) : (
              Object.entries(l.utm)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <p key={k}>
                    <span className="text-muted-foreground">{k}:</span> {v}
                  </p>
                ))
            )}
            {l.landingPath && (
              <p className="text-muted-foreground text-xs">Landing: {l.landingPath}</p>
            )}
            {l.protectedUntil && (
              <p className="text-xs">
                Protegido para el planner hasta {formatDate(l.protectedUntil)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Etapa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <LeadStageControl id={l.id} stage={l.stage} />
            {activeBooking ? (
              <Link href={`/admin/reservas/${activeBooking.id}`} className="text-sm underline">
                Reserva del {formatDate(activeBooking.eventDate)} (
                {STATUS_LABEL[activeBooking.status as BookingStatus]})
              </Link>
            ) : (
              l.stage !== "lost" && (
                <CreateBookingForm
                  leadId={l.id}
                  eventType={l.eventType}
                  eventDate={l.eventDate}
                  guests={l.guests}
                />
              )
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nueva actividad</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityForm leadId={l.id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            {l.activities.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin actividades.</p>
            ) : (
              <ol className="grid gap-3 text-sm">
                {l.activities.map((a) => (
                  <li key={a.id} className="border-brand-olive border-l-2 pl-3">
                    <p className="font-medium">
                      {KIND[a.kind]}{" "}
                      <span className="text-muted-foreground font-normal">
                        · {dt.format(new Date(a.createdAt))} · {a.actor}
                      </span>
                    </p>
                    {a.notes && <p>{a.notes}</p>}
                    {a.dueAt && (
                      <p className="text-muted-foreground text-xs">
                        Próximo paso: {dt.format(new Date(a.dueAt))}
                      </p>
                    )}
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

export default function LeadPage(props: PageProps<"/admin/crm/[id]">) {
  return (
    <div className="grid gap-4">
      <Link
        href="/admin/crm"
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> CRM
      </Link>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Detail params={props.params} />
      </Suspense>
    </div>
  );
}
