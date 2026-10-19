"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Tag } from "lucide-react";
import {
  addDays,
  addMonths,
  monthGrid,
  monthOf,
  monthsBetween,
  type EventType,
  type PublicDay,
} from "@/lib/domain";
import { track } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { monthCalendar, type MonthCalendarResult } from "@/server/public/actions";

const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const HEAD = [
  ["lu", "lunes"],
  ["ma", "martes"],
  ["mi", "miércoles"],
  ["ju", "jueves"],
  ["vi", "viernes"],
  ["sá", "sábado"],
  ["do", "domingo"],
] as const;
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const STATUS_TEXT = { free: "libre", hold: "en espera", taken: "ocupado", past: "pasado" };
const monthLabel = (m: string) => {
  const s = new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${m}-01T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const compact = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

const shownPrice = (day: PublicDay) => day.status === "free" && day.from !== null;

/**
 * Calendario vivo (patrón "grid" de WAI-ARIA para selección de fecha): flechas mueven el foco,
 * Inicio/Fin van al inicio/fin de la semana, RePág/AvPág cambian de mes, Enter o Espacio elige.
 * El estado no depende solo del color: precio, ícono de reloj, tachado y texto para lectores.
 */
export function DateGrid({
  eventType,
  guests,
  selected,
  refreshKey,
  onSelect,
  onUnavailable,
}: {
  eventType: EventType;
  guests: number;
  selected: string | null;
  /** Cambia para forzar la relectura del mes (p. ej. si la fecha se ocupó al tocarla). */
  refreshKey: number;
  onSelect: (date: string) => void;
  onUnavailable: (day: PublicDay) => void;
}) {
  const captionId = useId();
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<(MonthCalendarResult & { key: string }) | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const [debouncedGuests, setDebouncedGuests] = useState(guests);
  const grid = useRef<HTMLTableElement>(null);
  const viewed = useRef(false);

  // Invitados con pausa: no consulta en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedGuests(guests), 400);
    return () => clearTimeout(t);
  }, [guests]);

  const key = `${month ?? "hoy"}|${eventType}|${debouncedGuests}|${refreshKey}`;
  useEffect(() => {
    let alive = true;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
    monthCalendar({
      eventType,
      guests: Number.isFinite(debouncedGuests) && debouncedGuests > 0 ? debouncedGuests : 1,
      month: month ?? monthOf(today),
    }).then((res) => {
      if (!alive) return;
      setData({ ...res, key });
      if (res.ok && !viewed.current) {
        viewed.current = true;
        track("calendar_view", { event_type: eventType });
      }
    });
    return () => {
      alive = false;
    };
  }, [key, month, eventType, debouncedGuests]);

  // Foco del teclado en el día activo tras navegar
  useEffect(() => {
    if (!keyboard || !focus) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus();
  }, [keyboard, focus, data]);

  // Cargando también mientras corre la pausa de invitados (no mostrar precios de otro aforo)
  const loading = !data || data.key !== key || !Object.is(guests, debouncedGuests);
  const ok = data && data.ok ? data : null;
  const current = ok?.month ?? month;

  const goMonth = (delta: number, keepDay?: string) => {
    if (!ok) return;
    const next = addMonths(ok.month, delta);
    if (monthsBetween(ok.minMonth, next) < 0 || monthsBetween(next, ok.maxMonth) < 0) return;
    setMonth(next);
    if (keepDay) setFocus(`${next}-${keepDay.slice(8)}`);
    track("calendar_month", { month: next });
  };

  const byDate = new Map(ok?.days.map((d) => [d.date, d]) ?? []);
  const firstFocusable =
    ok?.days.find((d) => d.date === selected)?.date ??
    ok?.days.find((d) => d.status === "free")?.date ??
    ok?.days.find((d) => d.status !== "past")?.date ??
    ok?.days[0]?.date;
  const active = focus && byDate.has(focus) ? focus : firstFocusable;

  const move = (to: string) => {
    setKeyboard(true);
    if (byDate.has(to)) return setFocus(to);
    const delta = to > (ok?.days[ok.days.length - 1]?.date ?? "") ? 1 : -1;
    goMonth(delta);
    setFocus(to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!active) return;
    const w = (dow(active) + 6) % 7; // lunes = 0
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(addDays(active, 1)),
      ArrowLeft: () => move(addDays(active, -1)),
      ArrowDown: () => move(addDays(active, 7)),
      ArrowUp: () => move(addDays(active, -7)),
      Home: () => move(addDays(active, -w)),
      End: () => move(addDays(active, 6 - w)),
      PageDown: () => {
        setKeyboard(true);
        goMonth(1, active);
      },
      PageUp: () => {
        setKeyboard(true);
        goMonth(-1, active);
      },
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const choose = (day: PublicDay) => {
    setFocus(day.date);
    if (day.status === "free") {
      track("calendar_day_select", { date: day.date, offer: day.offer ? 1 : 0 });
      onSelect(day.date);
    } else if (day.status !== "past") {
      track("calendar_unavailable_tap", { date: day.date, status: day.status });
      onUnavailable(day);
    }
  };

  const visible = ok?.days.filter((d) => d.status !== "past") ?? [];
  const saturdays = visible.filter((d) => dow(d.date) === 6);
  const freeSaturdays = saturdays.filter((d) => d.status === "free").length;
  const high = ok?.days.some((d) => d.season === "high");

  return (
    <div className="grid gap-3" aria-busy={loading} data-calendar>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          disabled={!ok || ok.month === ok.minMonth || loading}
          onClick={() => goMonth(-1)}
          className="hover:bg-muted grid size-10 place-items-center rounded-md border disabled:opacity-40"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="text-center">
          <p id={captionId} aria-live="polite" className="font-display text-xl">
            {current ? monthLabel(current) : "Calendario"}
          </p>
          {ok && (
            <p className="text-muted-foreground text-xs">
              {high ? "Temporada alta" : "Temporada baja"}
              {saturdays.length > 0 && ` · Sábados libres: ${freeSaturdays} de ${saturdays.length}`}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Mes siguiente"
          disabled={!ok || ok.month === ok.maxMonth || loading}
          onClick={() => goMonth(1)}
          className="hover:bg-muted grid size-10 place-items-center rounded-md border disabled:opacity-40"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      {data && !data.ok ? (
        <p className="text-destructive text-sm">{data.error}</p>
      ) : (
        <table
          ref={grid}
          role="grid"
          aria-labelledby={captionId}
          data-month={ok?.month}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full table-fixed border-separate border-spacing-1",
            loading && "opacity-50",
          )}
        >
          <thead>
            <tr>
              {HEAD.map(([abbr, full]) => (
                <th
                  key={abbr}
                  scope="col"
                  abbr={full}
                  className="text-muted-foreground pb-1 text-xs font-normal"
                >
                  {abbr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ok &&
              chunk(monthGrid(ok.month), 7).map((week, i) => (
                <tr key={i}>
                  {week.map((date, j) => {
                    const day = date ? byDate.get(date) : undefined;
                    if (!day) return <td key={`e${j}`} role="gridcell" aria-hidden />;
                    const isSelected = day.date === selected;
                    return (
                      <td key={day.date} role="gridcell" aria-selected={isSelected}>
                        <button
                          type="button"
                          data-date={day.date}
                          data-status={day.status}
                          tabIndex={day.date === active ? 0 : -1}
                          aria-disabled={day.status === "past"}
                          onClick={() => choose(day)}
                          onFocus={() => setFocus(day.date)}
                          className={cn(
                            "relative flex h-12 w-full flex-col items-center justify-center rounded-md text-sm leading-none sm:h-14",
                            "focus-visible:ring-ring outline-none focus-visible:ring-2",
                            day.status === "free" &&
                              "bg-secondary/70 hover:bg-secondary font-medium",
                            day.status === "hold" && "hold-stripes text-muted-foreground",
                            day.status === "taken" && "text-muted-foreground/70 line-through",
                            day.status === "past" && "text-muted-foreground/40 cursor-default",
                            isSelected && "ring-brand-camel bg-card ring-2",
                          )}
                        >
                          {day.holiday && (
                            <span
                              aria-hidden
                              className="bg-brand-camel absolute top-1 right-1 size-1.5 rounded-full"
                            />
                          )}
                          {/* Nombre accesible = texto visible + texto solo para lectores (WCAG 2.5.3) */}
                          <span>
                            <span className="sr-only">{DOW[dow(day.date)]} </span>
                            {Number(day.date.slice(8))}
                            <span className="sr-only">
                              {` de ${MONTHS[Number(day.date.slice(5, 7)) - 1]} de ${day.date.slice(0, 4)}, ${STATUS_TEXT[day.status]}`}
                              {shownPrice(day) ? ", desde S/" : ""}
                            </span>
                          </span>
                          {shownPrice(day) && (
                            <span
                              className={cn(
                                "mt-1 flex items-center gap-0.5 text-[10px] font-normal",
                                day.offer
                                  ? "text-brand-green dark:text-brand-camel font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              {day.offer && <Tag aria-hidden className="size-2.5" />}
                              {compact(day.from!)}
                            </span>
                          )}
                          <span className="sr-only">
                            {day.offer && shownPrice(day) ? ", oferta" : ""}
                            {day.holiday ? ", feriado" : ""}
                          </span>
                          {day.status === "hold" && <Clock aria-hidden className="mt-1 size-3" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <ul
        className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs"
        aria-label="Leyenda"
      >
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="bg-secondary/70 size-3 rounded-sm" /> Libre
        </li>
        <li className="flex items-center gap-1.5">
          <Clock aria-hidden className="size-3" /> En espera (alguien la está separando)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="line-through">
            12
          </span>{" "}
          Ocupado
        </li>
        {ok?.pricesEnabled && (
          <li className="flex items-center gap-1.5">
            <Tag aria-hidden className="size-3" /> Oferta
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="bg-brand-camel size-1.5 rounded-full" /> Feriado
        </li>
      </ul>
      {ok?.pricesEnabled && (
        <p className="text-muted-foreground text-xs">
          Precios desde, en S/ con IGV, para {debouncedGuests} invitados. El precio exacto llega en
          tu cotización.
        </p>
      )}
    </div>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );
}
