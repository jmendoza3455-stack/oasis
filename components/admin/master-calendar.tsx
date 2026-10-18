"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import listPlugin from "@fullcalendar/react/list";
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
import { addDays, formatDate, STATUS_LABEL } from "@/lib/domain";
import { CHANNEL_LABEL, EVENT_TYPE_LABEL, STATUS_COLOR } from "@/lib/ui/status";
import type { CalendarBlock, CalendarBooking } from "@/server/queries/calendar";
import { createBlock, deleteBlock } from "@/app/admin/calendario/actions";

type Props = { bookings: CalendarBooking[]; blocks: CalendarBlock[]; today: string };

export function MasterCalendar({ bookings, blocks, today }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<{ startsOn: string; endsOn: string } | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<CalendarBlock | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const events = useMemo(
    () => [
      ...bookings.map((b) => ({
        id: `b:${b.id}`,
        start: b.eventDate,
        allDay: true,
        title: `${STATUS_LABEL[b.status]} · ${b.clientName ?? EVENT_TYPE_LABEL[b.eventType]}`,
        color: STATUS_COLOR[b.status].bg,
        contrastColor: STATUS_COLOR[b.status].fg,
        extendedProps: { kind: "booking", channel: b.channel },
      })),
      ...blocks.map((k) => ({
        id: `k:${k.id}`,
        start: k.startsOn,
        end: addDays(k.endsOn, 1),
        allDay: true,
        title: `Bloqueado · ${k.reason}`,
        color: STATUS_COLOR.blocked.bg,
        contrastColor: STATUS_COLOR.blocked.fg,
        extendedProps: { kind: "block" },
      })),
    ],
    [bookings, blocks],
  );

  function submitBlock(formData: FormData) {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const res = await createBlock({
        startsOn: String(formData.get("startsOn")),
        endsOn: String(formData.get("endsOn")),
        kind: String(formData.get("kind")) as "maintenance",
        reason: String(formData.get("reason")),
      });
      if (res.ok) setDraft(null);
      else setError(res.error);
    });
  }

  return (
    <div className="grid gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Leyenda de estados">
        {(["prebooked", "reserved", "confirmed", "done", "settled"] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: STATUS_COLOR[s].bg }} />
            {STATUS_LABEL[s]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: STATUS_COLOR.blocked.bg }} />
          Bloqueado
        </li>
      </ul>

      <div className="oasis-calendar bg-card rounded-xl border p-2 md:p-4">
        <FullCalendar
          plugins={[classicThemePlugin, dayGridPlugin, listPlugin, interactionPlugin]}
          locale={esLocale}
          firstDay={1}
          initialView="dayGridMonth"
          initialDate={today}
          headerToolbar={{
            start: "prev,next today",
            center: "title",
            end: "dayGridMonth,dayGridWeek,listMonth",
          }}
          height="auto"
          fixedWeekCount={false}
          dayMaxEvents={2}
          selectable
          events={events}
          dateClick={(info) => {
            setError(null);
            setDraft({ startsOn: info.dateStr, endsOn: info.dateStr });
          }}
          select={(info) => {
            if (info.end.getTime() - info.start.getTime() <= 86_400_000) return; // un día: lo maneja dateClick
            setError(null);
            setDraft({ startsOn: info.startStr, endsOn: addDays(info.endStr, -1) });
          }}
          eventClick={(info) => {
            const [kind, id] = info.event.id.split(":");
            if (kind === "b") router.push(`/admin/reservas/${id}`);
            else setBlockToDelete(blocks.find((k) => k.id === id) ?? null);
          }}
          eventContent={(arg) => (
            <span className="block truncate px-1 text-[11px] leading-5">
              {arg.event.extendedProps.kind === "booking" && (
                <abbr
                  title={
                    CHANNEL_LABEL[arg.event.extendedProps.channel as keyof typeof CHANNEL_LABEL]
                  }
                  className="mr-1 no-underline opacity-80"
                >
                  {String(
                    CHANNEL_LABEL[arg.event.extendedProps.channel as keyof typeof CHANNEL_LABEL],
                  ).slice(0, 1)}
                </abbr>
              )}
              {arg.event.title}
            </span>
          )}
        />
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear fechas</DialogTitle>
            <DialogDescription>
              Para mantenimiento u otro motivo. Las fechas bloqueadas no se pueden reservar.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form action={submitBlock} className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="startsOn">Desde</Label>
                  <Input
                    id="startsOn"
                    name="startsOn"
                    type="date"
                    defaultValue={draft.startsOn}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endsOn">Hasta</Label>
                  <Input
                    id="endsOn"
                    name="endsOn"
                    type="date"
                    defaultValue={draft.endsOn}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kind">Tipo</Label>
                <NativeSelect id="kind" name="kind" defaultValue="maintenance">
                  <option value="maintenance">Mantenimiento</option>
                  <option value="owner_use">Uso propio</option>
                  <option value="other">Otro</option>
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  name="reason"
                  placeholder="Ej. limpieza profunda de piscina"
                  required
                />
              </div>
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Bloquear"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={blockToDelete !== null}
        onOpenChange={(open) => !open && setBlockToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar bloqueo</DialogTitle>
            <DialogDescription>
              {blockToDelete &&
                `${blockToDelete.reason} · ${formatDate(blockToDelete.startsOn)} al ${formatDate(blockToDelete.endsOn)}`}
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              blockToDelete &&
              startTransition(async () => {
                await deleteBlock(blockToDelete.id);
                setBlockToDelete(null);
              })
            }
          >
            Quitar bloqueo y liberar fechas
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
