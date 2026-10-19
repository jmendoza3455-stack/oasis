import type { Metadata } from "next";
import { Suspense } from "react";
import { PromotionForm } from "@/components/admin/promotion-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { withDb } from "@/lib/db";
import { formatDate } from "@/lib/domain";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { staffVenue } from "@/server/venue";
import { deactivatePromotion } from "./actions";

export const metadata: Metadata = { title: "Promociones" };

const DAY_LABEL: Record<string, string> = {
  mon_thu: "L-J",
  fri: "Viernes",
  sat: "Sábado",
  sun_holiday: "Domingo/feriado",
};

async function Promotions() {
  const user = await requireStaff();
  const venue = await staffVenue(user.id);
  const { rows, cap, used } = await withDb({ kind: "user", userId: user.id }, async (sql) => ({
    rows: await sql<{
      id: string;
      name: string;
      eventTypes: (keyof typeof EVENT_TYPE_LABEL)[] | null;
      dayTypes: string[] | null;
      startsOn: string;
      endsOn: string;
      discountPct: number;
      isActive: boolean;
    }>(
      `select id, name, event_types::text[] as "eventTypes", day_types as "dayTypes",
              to_char(starts_on, 'YYYY-MM-DD') as "startsOn", to_char(ends_on, 'YYYY-MM-DD') as "endsOn",
              discount_pct::float8 as "discountPct", is_active as "isActive"
         from promotions where venue_id = $1 order by is_active desc, starts_on desc`,
      [venue.id],
    ),
    cap: Number(
      (
        await sql<{ v: string }>(
          `select value #>> '{}' as v from settings where venue_id = $1 and key = 'discount_cap_pct'`,
          [venue.id],
        )
      )[0]?.v ?? 10,
    ),
    used: Object.fromEntries(
      (
        await sql<{ id: string; n: number }>(
          `select promotion_id as id, count(*)::int as n from bookings where promotion_id is not null group by 1`,
        )
      ).map((r) => [r.id, r.n]),
    ) as Record<string, number>,
  }));
  return (
    <div className="grid gap-4">
      {user.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva promoción</CardTitle>
          </CardHeader>
          <CardContent>
            <PromotionForm capPct={cap} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Promociones</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin promociones.</p>
          ) : (
            <ul className="divide-y text-sm">
              {rows.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant="outline">−{p.discountPct} %</Badge>
                  <span className="text-muted-foreground">
                    {formatDate(p.startsOn)} – {formatDate(p.endsOn)} ·{" "}
                    {p.eventTypes?.map((t) => EVENT_TYPE_LABEL[t]).join(", ") ??
                      "Todos los segmentos"}{" "}
                    · {p.dayTypes?.map((d) => DAY_LABEL[d]).join(", ") ?? "Todos los días"} ·{" "}
                    {used[p.id] ?? 0} reservas
                  </span>
                  {p.isActive ? (
                    user.role === "admin" && (
                      <form action={deactivatePromotion} className="ml-auto">
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Desactivar
                        </Button>
                      </form>
                    )
                  ) : (
                    <Badge variant="outline" className="ml-auto">
                      Inactiva
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        Las promociones se aplican solas en el cotizador público, el chat y las pre-reservas;
        siempre dentro del tope de descuento. El agente Revenue las propone en /admin/agentes.
      </p>
    </div>
  );
}

export default function PromocionesPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Promociones</h1>
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Promotions />
      </Suspense>
    </div>
  );
}
