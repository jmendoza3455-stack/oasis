import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { ActaPhotos, ChecklistEditor, CostsEditor, Incidents } from "@/components/admin/operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import {
  CHECKLIST_LABEL,
  COST_LABEL,
  DEFAULT_CHECKLISTS,
  type ChecklistKind,
  type CostCategory,
} from "@/lib/content/operations";
import { withDb } from "@/lib/db";
import { formatDate } from "@/lib/domain";
import { npsToken } from "@/lib/nps";
import { fileUrl } from "@/lib/storage";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";

export const metadata: Metadata = { title: "Operación del evento" };

async function Ops({ params }: { params: PageProps<"/admin/reservas/[id]/operacion">["params"] }) {
  const user = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await withDb({ kind: "user", userId: user.id }, async (sql) => {
    const [b] = await sql<{
      eventDate: string;
      eventType: keyof typeof EVENT_TYPE_LABEL;
      status: string;
      venueId: string;
      client: string | null;
    }>(
      `select to_char(b.event_date, 'YYYY-MM-DD') as "eventDate", b.event_type as "eventType", b.status, b.venue_id as "venueId", c.full_name as client
         from bookings b left join clients c on c.id = b.client_id where b.id = $1`,
      [id],
    );
    if (!b) return null;
    const checklists = await sql<{
      kind: ChecklistKind;
      items: { label: string; done: boolean }[];
      completedAt: string | null;
    }>(
      `select kind, items, to_json(completed_at) #>> '{}' as "completedAt" from checklists where booking_id = $1`,
      [id],
    );
    const [tpl] = await sql<{
      checklists: Partial<Record<ChecklistKind, string[]>> | null;
      costs: Partial<Record<CostCategory, number>> | null;
    }>(
      `select (select value from settings where venue_id = $1 and key = 'checklist_templates') as checklists,
              (select value from settings where venue_id = $1 and key = 'standard_event_costs') as costs`,
      [b.venueId],
    );
    const costs = await sql<{ category: CostCategory; standard: number; actual: number | null }>(
      `select category, standard_amount::float8 as standard, actual_amount::float8 as actual from event_costs where booking_id = $1`,
      [id],
    );
    const incidents = await sql<{
      id: string;
      description: string;
      amount: number;
      chargeToGuarantee: boolean;
    }>(
      `select id, description, amount::float8 as amount, charge_to_guarantee as "chargeToGuarantee" from incidents where booking_id = $1 order by created_at`,
      [id],
    );
    const photos = await sql<{ path: string }>(
      `select storage_path as path from documents where booking_id = $1 and kind = 'handover_photo' order by created_at`,
      [id],
    );
    const [g] = await sql<{ status: string }>(
      `select status from guarantees where booking_id = $1`,
      [id],
    );
    const [nps] = await sql<{ score: number; comment: string | null }>(
      `select score, comment from nps_responses where booking_id = $1`,
      [id],
    );
    return {
      b,
      checklists,
      tpl,
      costs,
      incidents,
      photos,
      guaranteeHeld: g?.status === "held",
      nps,
    };
  });
  if (!data) notFound();
  const { b } = data;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const costRows = (Object.keys(COST_LABEL) as CostCategory[]).map((category) => {
    const saved = data.costs.find((c) => c.category === category);
    return {
      category,
      standard: saved?.standard ?? data.tpl?.costs?.[category] ?? 0,
      actual: saved?.actual ?? null,
    };
  });

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-display text-3xl">
          Operación · {EVENT_TYPE_LABEL[b.eventType]} {formatDate(b.eventDate)}
        </h1>
        <p className="text-muted-foreground text-sm">{b.client}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklists</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(Object.keys(CHECKLIST_LABEL) as ChecklistKind[]).map((kind) => {
              const saved = data.checklists.find((c) => c.kind === kind);
              const labels = data.tpl?.checklists?.[kind] ?? DEFAULT_CHECKLISTS[kind];
              const items = saved?.items ?? labels.map((label) => ({ label, done: false }));
              return (
                <ChecklistEditor
                  key={kind}
                  bookingId={id}
                  kind={kind}
                  title={CHECKLIST_LABEL[kind]}
                  initial={items}
                  completedAt={saved?.completedAt ?? null}
                />
              );
            })}
          </CardContent>
        </Card>
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Acta con fotos</CardTitle>
            </CardHeader>
            <CardContent>
              <ActaPhotos
                bookingId={id}
                photos={await Promise.all(
                  data.photos.map(async (p) => ({ url: await fileUrl(p.path) })),
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Incidencias y daños</CardTitle>
            </CardHeader>
            <CardContent>
              <Incidents
                bookingId={id}
                incidents={data.incidents}
                isAdmin={user.role === "admin"}
                guaranteeHeld={data.guaranteeHeld}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Costos directos del evento</CardTitle>
            </CardHeader>
            <CardContent>
              <CostsEditor bookingId={id} rows={costRows} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Encuesta NPS</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {data.nps ? (
                <p>
                  Calificación: <strong>{data.nps.score}</strong>/10{" "}
                  {data.nps.comment && `· «${data.nps.comment}»`}
                </p>
              ) : ["done", "settled"].includes(b.status) ? (
                <>
                  <p className="text-muted-foreground">Envía este enlace al cliente:</p>
                  <code className="bg-muted rounded p-2 text-xs break-all">{`${site}/encuesta/${npsToken(id)}`}</code>
                </>
              ) : (
                <p className="text-muted-foreground">Disponible cuando el evento esté realizado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OpsPage(props: PageProps<"/admin/reservas/[id]/operacion">) {
  return (
    <div className="grid gap-4">
      <BackLink params={props.params} />
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <Ops params={props.params} />
      </Suspense>
    </div>
  );
}

function BackLink({ params }: { params: PageProps<"/admin/reservas/[id]/operacion">["params"] }) {
  return (
    <Suspense fallback={null}>
      <BackLinkInner params={params} />
    </Suspense>
  );
}

async function BackLinkInner({
  params,
}: {
  params: PageProps<"/admin/reservas/[id]/operacion">["params"];
}) {
  const { id } = await params;
  return (
    <Link
      href={`/admin/reservas/${id}`}
      className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> Ficha de la reserva
    </Link>
  );
}
