import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth/session";
import { firstResponseSla, formatDate } from "@/lib/domain";
import { CHANNEL_LABEL, EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { cn } from "@/lib/utils";
import { leadBoard, STAGES } from "@/server/queries/crm";
import { activeVenue } from "@/server/venue";

export const metadata: Metadata = { title: "CRM" };

async function Board({ searchParams }: { searchParams: PageProps<"/admin/crm">["searchParams"] }) {
  const user = await requireStaff();
  const venue = await activeVenue();
  const sp = await searchParams;
  const channel = typeof sp.canal === "string" ? sp.canal : undefined;
  const eventType = typeof sp.tipo === "string" ? sp.tipo : undefined;
  const { leads, sla } = await leadBoard(user.id, venue.id, { channel, eventType });
  const now = new Date();
  const filterLink = (key: string, value?: string) => {
    const next = new URLSearchParams({
      ...(channel ? { canal: channel } : {}),
      ...(eventType ? { tipo: eventType } : {}),
    });
    if (value) next.set(key, value);
    else next.delete(key);
    const q = next.toString();
    return q ? `/admin/crm?${q}` : "/admin/crm";
  };

  return (
    <div className="grid gap-4">
      <nav aria-label="Filtros" className="flex flex-wrap gap-2 text-sm">
        <Link
          href={filterLink("canal")}
          className={cn(
            "rounded-full border px-3 py-1",
            !channel && "bg-primary text-primary-foreground",
          )}
        >
          Todos los canales
        </Link>
        {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
          <Link
            key={k}
            href={filterLink("canal", k)}
            className={cn(
              "rounded-full border px-3 py-1",
              channel === k && "bg-primary text-primary-foreground",
            )}
          >
            {v}
          </Link>
        ))}
      </nav>
      <div className="flex gap-3 overflow-x-auto pb-4" role="list" aria-label="Embudo de leads">
        {STAGES.map((s) => {
          const items = leads.filter((l) => l.stage === s.key);
          return (
            <section
              key={s.key}
              role="listitem"
              aria-label={s.label}
              className="bg-muted/60 flex w-72 shrink-0 flex-col gap-2 rounded-xl p-2"
            >
              <h2 className="flex items-center justify-between px-1 text-sm font-medium">
                {s.label} <span className="text-muted-foreground">{items.length}</span>
              </h2>
              {items.map((l) => {
                const state = firstResponseSla(
                  new Date(l.createdAt),
                  l.firstResponseAt ? new Date(l.firstResponseAt) : null,
                  now,
                  sla.hours,
                  sla.minutes,
                );
                return (
                  <Link
                    key={l.id}
                    href={`/admin/crm/${l.id}`}
                    className="bg-card hover:border-brand-olive grid gap-1 rounded-lg border p-3 text-sm"
                  >
                    <span className="font-medium">{l.clientName ?? "Sin nombre"}</span>
                    <span className="text-muted-foreground text-xs">
                      {l.eventType ? EVENT_TYPE_LABEL[l.eventType] : "—"}
                      {l.eventDate && ` · ${formatDate(l.eventDate)}`}
                      {l.guests && ` · ${l.guests} inv.`}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      <Badge variant="outline">{CHANNEL_LABEL[l.channel]}</Badge>
                      {l.utmCampaign && <Badge variant="secondary">{l.utmCampaign}</Badge>}
                      {l.attributionAlert && (
                        <Badge className="bg-[#C2683F] text-white">
                          <AlertTriangle className="size-3" aria-hidden /> Planner
                        </Badge>
                      )}
                      {l.stage === "new" && !state.answered && (
                        <Badge
                          className={
                            state.overdue
                              ? "bg-destructive text-white"
                              : "bg-secondary text-secondary-foreground"
                          }
                        >
                          <Clock className="size-3" aria-hidden /> {state.minutes} min
                        </Badge>
                      )}
                    </span>
                  </Link>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function CrmPage(props: PageProps<"/admin/crm">) {
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-display text-3xl">CRM</h1>
        <p className="text-muted-foreground text-sm">
          Leads por etapa. El reloj marca minutos hábiles sin primera respuesta (meta: 15 min).
        </p>
      </header>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <Board searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
