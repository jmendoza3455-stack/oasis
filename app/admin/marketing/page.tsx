import type { Metadata } from "next";
import { Suspense } from "react";
import { Download } from "lucide-react";
import {
  ClipUploader,
  CopyButton,
  MetricsForm,
  PieceDecision,
  PublishForm,
} from "@/components/admin/marketing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { formatDate } from "@/lib/domain";
import { marketingFileUrl } from "@/lib/storage";
import { activeVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Marketing" };

type Check = {
  id: string;
  label: string;
  ok: boolean;
  severity: "error" | "warning";
  detail?: string;
};
type Piece = {
  id: string;
  code: string;
  version: number;
  kind: "reel" | "carousel" | "story" | "gbp_post";
  title: string;
  pillar: string | null;
  status: "draft" | "review" | "changes" | "approved" | "published" | "discarded";
  caption: string | null;
  hashtags: string | null;
  videoKey: string | null;
  coverKey: string | null;
  imageKeys: string[];
  qa: { score: number; checks: Check[] } | null;
  review: { score: number; verdict: string; notes: string[] } | null;
  feedback: string | null;
  publishedAt: string | null;
  publishedUrls: Record<string, string>;
  metrics: Record<string, number>;
  agent: string | null;
  createdAt: string;
};

const KIND: Record<Piece["kind"], string> = {
  reel: "Reel",
  carousel: "Carrusel",
  story: "Historia",
  gbp_post: "Google Business",
};

async function withUrls(p: Piece) {
  const file = (key: string | null, name?: string) => (key ? marketingFileUrl(key, name) : null);
  return {
    ...p,
    video: await file(p.videoKey),
    videoDownload: await file(p.videoKey, `${p.code}-v${p.version}.mp4`),
    cover: await file(p.coverKey),
    images: await Promise.all(p.imageKeys.map((k) => marketingFileUrl(k))),
  };
}

function Score({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 85
      ? "bg-primary text-primary-foreground"
      : value >= 70
        ? "bg-secondary"
        : "bg-destructive text-white";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label} {value}/100
    </span>
  );
}

function PieceMedia({ p }: { p: Awaited<ReturnType<typeof withUrls>> }) {
  if (p.video)
    return (
      <video
        src={p.video}
        poster={p.cover ?? undefined}
        controls
        playsInline
        preload="none"
        className="aspect-[9/16] w-full max-w-[260px] rounded-lg bg-black"
      />
    );
  if (p.images.length)
    return (
      <div className="flex max-w-full gap-2 overflow-x-auto">
        {p.images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal
          <img
            key={src}
            src={src}
            alt={`${p.title}, lámina ${i + 1}`}
            className="h-64 w-auto rounded-lg"
          />
        ))}
      </div>
    );
  return null;
}

function PieceCard({
  p,
  admin,
  children,
}: {
  p: Awaited<ReturnType<typeof withUrls>>;
  admin: boolean;
  children?: React.ReactNode;
}) {
  const failing = p.qa?.checks.filter((c) => !c.ok) ?? [];
  return (
    <li className="grid gap-4 rounded-xl border p-4 md:grid-cols-[260px_1fr]">
      <PieceMedia p={p} />
      <div className="grid min-w-0 content-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{KIND[p.kind]}</Badge>
          <span className="font-mono text-xs">
            {p.code.toUpperCase()} · v{p.version}
          </span>
          {p.pillar && <span className="text-muted-foreground text-xs">{p.pillar}</span>}
          {p.agent && <span className="text-muted-foreground text-xs">· {p.agent}</span>}
        </div>
        <h3 className="font-medium">{p.title}</h3>
        <div className="flex flex-wrap gap-2">
          {p.review && <Score label="Director creativo" value={p.review.score} />}
          {p.qa && <Score label="Técnico" value={p.qa.score} />}
        </div>
        {p.review?.notes.length ? (
          <ul className="text-muted-foreground list-disc pl-5 text-sm">
            {p.review.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}
        {failing.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer">Observaciones técnicas ({failing.length})</summary>
            <ul className="mt-1 list-disc pl-5">
              {failing.map((c) => (
                <li key={c.id} className={c.severity === "error" ? "text-destructive" : undefined}>
                  {c.label}
                  {c.detail ? ` (${c.detail})` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
        {p.caption && (
          <div className="bg-muted grid gap-2 rounded-lg p-3 text-sm">
            <p className="whitespace-pre-line">{p.caption}</p>
            {p.hashtags && <p className="text-muted-foreground">{p.hashtags}</p>}
            <div className="flex flex-wrap gap-2">
              <CopyButton text={[p.caption, p.hashtags].filter(Boolean).join("\n\n")} />
              {p.videoDownload && (
                <a
                  href={p.videoDownload}
                  className="hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
                >
                  <Download className="size-4" aria-hidden /> Descargar video
                </a>
              )}
            </div>
          </div>
        )}
        {p.feedback && p.status !== "approved" && (
          <p className="text-sm">
            <span className="font-medium">Tu comentario:</span> {p.feedback}
          </p>
        )}
        {admin && children}
      </div>
    </li>
  );
}

async function Marketing() {
  const user = await requireStaff();
  const admin = user.role === "admin";
  const venue = await activeVenue();
  const { pieces, clips, counts } = await withDb(
    { kind: "user", userId: user.id },
    async (sql) => ({
      pieces: await sql<Piece>(
        `select id, code, version, kind, title, pillar, status, caption, hashtags,
              video_key as "videoKey", cover_key as "coverKey", image_keys as "imageKeys", qa, review,
              feedback, to_char(published_at at time zone 'America/Lima', 'YYYY-MM-DD') as "publishedAt",
              published_urls as "publishedUrls", metrics, created_by_agent as agent,
              to_char(created_at at time zone 'America/Lima', 'YYYY-MM-DD') as "createdAt"
         from marketing_pieces
        where venue_id = $1 and (status <> 'published' or published_at > now() - interval '60 days')
          and status <> 'discarded'
        order by created_at desc limit 60`,
        [venue.id],
      ),
      clips: await sql<{
        id: string;
        key: string;
        filename: string;
        notes: string | null;
        size: number;
        createdAt: string;
      }>(
        `select id, storage_key as key, filename, notes, size_bytes::float8 as size,
              to_char(created_at at time zone 'America/Lima', 'YYYY-MM-DD') as "createdAt"
         from marketing_clips where venue_id = $1 order by created_at desc limit 40`,
        [venue.id],
      ),
      counts: (
        await sql<{ newClips: number; published30: number }>(
          `select (select count(*) from marketing_clips where venue_id = $1 and created_at > now() - interval '7 days')::int as "newClips",
                (select count(*) from marketing_pieces where venue_id = $1 and status = 'published' and published_at > now() - interval '30 days')::int as "published30"`,
          [venue.id],
        )
      )[0],
    }),
  );
  const withMedia = await Promise.all(pieces.map(withUrls));
  const by = (s: Piece["status"][]) => withMedia.filter((p) => s.includes(p.status));
  const review = by(["review"]);
  const ready = by(["approved"]);
  const changes = by(["changes", "draft"]);
  const published = by(["published"]);
  const tiles = [
    ["Para revisar", review.length],
    ["Listas para publicar", ready.length],
    ["Publicadas (30 días)", counts.published30],
    ["Clips nuevos (7 días)", counts.newClips],
  ] as const;

  return (
    <div className="grid gap-4">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Resumen de marketing">
        {tiles.map(([label, value]) => (
          <li key={label} className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-3xl font-semibold tabular-nums">{value}</p>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Para revisar</CardTitle>
        </CardHeader>
        <CardContent>
          {review.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nada pendiente. El equipo deja aquí cada pieza con su puntaje del director creativo y
              del control técnico.
            </p>
          ) : (
            <ul className="grid gap-4">
              {review.map((p) => (
                <PieceCard key={p.id} p={p} admin={admin}>
                  <PieceDecision id={p.id} />
                </PieceCard>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listas para publicar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            Descarga el video, copia el caption, elige la música en la app y publica. Luego pega los
            enlaces para medir la pieza.
          </p>
          {ready.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin piezas aprobadas por publicar.</p>
          ) : (
            <ul className="grid gap-4">
              {ready.map((p) => (
                <PieceCard key={p.id} p={p} admin={admin}>
                  <PublishForm id={p.id} />
                </PieceCard>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {changes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>En cambios</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4">
              {changes.map((p) => (
                <PieceCard key={p.id} p={p} admin={false} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Publicadas y resultados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            A los 7 días, copia los números de las estadísticas de cada red. El equipo los usa para
            decidir qué repetir y qué cortar.
          </p>
          {published.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay piezas publicadas.</p>
          ) : (
            <ul className="divide-y">
              {published.map((p) => (
                <li key={p.id} className="grid gap-2 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-xs">{p.code.toUpperCase()}</span>
                    <span className="font-medium">{p.title}</span>
                    {p.publishedAt && (
                      <span className="text-muted-foreground">· {formatDate(p.publishedAt)}</span>
                    )}
                    {Object.entries(p.publishedUrls).map(([net, href]) => (
                      <a
                        key={net}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {net}
                      </a>
                    ))}
                  </div>
                  {admin && <MetricsForm id={p.id} metrics={p.metrics} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clips</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ClipUploader />
          {clips.length > 0 && (
            <ul className="divide-y text-sm">
              {clips.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">
                    {c.filename}
                    {c.notes && <span className="text-muted-foreground"> · {c.notes}</span>}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {(c.size / 1048576).toFixed(1)} MB · {formatDate(c.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Marketing</h1>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Marketing />
      </Suspense>
    </div>
  );
}
