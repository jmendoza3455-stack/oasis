"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import esLocale from "@fullcalendar/react/locales/es";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { formatDate, type EventType } from "@/lib/domain";
import { EVENT_TYPE_LABEL, STATUS_COLOR } from "@/lib/ui/status";
import { createHold } from "@/app/planners/portal/actions";

type Day = { day: string; status: "free" | "prebooked" | "occupied" };

export function PlannerAvailability({
  days,
  clients,
  today,
  holdHours,
  canHold,
}: {
  days: Day[];
  clients: { id: string; fullName: string }[];
  today: string;
  holdHours: number;
  canHold: boolean;
}) {
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const statusOf = useMemo(() => new Map(days.map((d) => [d.day, d.status])), [days]);

  const events = useMemo(
    () =>
      days
        .filter((d) => d.status !== "free")
        .map((d) => ({
          id: d.day,
          start: d.day,
          allDay: true,
          title: d.status === "prebooked" ? "Pre-reservado" : "Ocupado",
          color: d.status === "prebooked" ? STATUS_COLOR.prebooked.bg : STATUS_COLOR.blocked.bg,
          contrastColor:
            d.status === "prebooked" ? STATUS_COLOR.prebooked.fg : STATUS_COLOR.blocked.fg,
        })),
    [days],
  );

  const submit = (formData: FormData) =>
    start(async () => {
      setError(null);
      const res = await createHold({
        date: date!,
        clientId: String(formData.get("clientId")),
        eventType: String(formData.get("eventType")) as EventType,
        guests: Number(formData.get("guests")),
      });
      if (res.ok) {
        setDone(date);
        setDate(null);
      } else setError(res.error);
    });

  return (
    <div className="grid gap-4">
      {done && (
        <p role="status" className="bg-secondary rounded-md p-3 text-sm">
          Pre-reserva creada para el {formatDate(done)}. Vence en {holdHours} horas:{" "}
          <Link href="/planners/portal/reservas" className="underline">
            ver mis reservas
          </Link>
          .
        </p>
      )}
      <div className="oasis-calendar bg-card rounded-xl border p-2 md:p-4">
        <FullCalendar
          plugins={[classicThemePlugin, dayGridPlugin, interactionPlugin]}
          locale={esLocale}
          firstDay={1}
          initialView="dayGridMonth"
          initialDate={today}
          headerToolbar={{ start: "prev,next today", center: "title", end: "" }}
          height="auto"
          fixedWeekCount={false}
          events={events}
          dateClick={(info) => {
            if (!canHold || info.dateStr < today || statusOf.get(info.dateStr) !== "free") return;
            setError(null);
            setDate(info.dateStr);
          }}
        />
      </div>
      <Dialog open={date !== null} onOpenChange={(o) => !o && setDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pre-reservar {date && formatDate(date)}</DialogTitle>
            <DialogDescription>
              La fecha queda separada por {holdHours} horas para tu cliente. Luego vence sola.
            </DialogDescription>
          </DialogHeader>
          {clients.length === 0 ? (
            <p className="text-sm">
              Primero{" "}
              <Link href="/planners/portal/clientes" className="underline">
                registra a tu cliente
              </Link>
              .
            </p>
          ) : (
            <form action={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientId">Cliente</Label>
                <NativeSelect id="clientId" name="clientId" required>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="h-type">Tipo de evento</Label>
                  <NativeSelect id="h-type" name="eventType" defaultValue="wedding">
                    {(Object.keys(EVENT_TYPE_LABEL) as EventType[]).map((k) => (
                      <option key={k} value={k}>
                        {EVENT_TYPE_LABEL[k]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="h-guests">Invitados</Label>
                  <Input id="h-guests" name="guests" type="number" min={1} max={500} required />
                </div>
              </div>
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Separando…" : "Crear pre-reserva"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
