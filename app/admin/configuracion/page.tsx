import type { Metadata } from "next";
import { Suspense } from "react";
import {
  DeleteHolidayButton,
  HolidayEditor,
  RateRow,
  SettingRow,
} from "@/components/admin/config-editors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { SETTINGS } from "@/lib/content/settings-schema";
import { withDb } from "@/lib/db";
import { formatDate, type EventType } from "@/lib/domain";
import { EVENT_TYPE_LABEL } from "@/lib/ui/status";
import { staffVenue } from "@/server/venue";

export const metadata: Metadata = { title: "Configuración" };

const DAY = {
  mon_thu: "Lun–Jue",
  fri: "Viernes",
  sat: "Sábado",
  sun_holiday: "Dom / feriado",
} as const;

async function Config() {
  const user = await requireStaff();
  const venue = await staffVenue(user.id);
  const canEdit = user.role === "admin";
  const { settings, rates, holidays } = await withDb(
    { kind: "user", userId: user.id },
    async (sql) => ({
      settings: Object.fromEntries(
        (
          await sql<{ key: string; value: unknown }>(
            `select key, value from settings where venue_id = $1`,
            [venue.id],
          )
        ).map((r) => [r.key, r.value]),
      ),
      rates: await sql<{
        id: string;
        eventType: EventType;
        dayType: keyof typeof DAY;
        season: string;
        priceNet: number;
        placeholder: boolean;
      }>(
        `select id, event_type as "eventType", day_type as "dayType", season, price_net::float8 as "priceNet", is_placeholder as placeholder
         from rate_cards where venue_id = $1
        order by event_type, season desc, array_position(array['mon_thu','fri','sat','sun_holiday'], day_type)`,
        [venue.id],
      ),
      holidays: await sql<{ date: string; name: string; type: string }>(
        `select to_char(date, 'YYYY-MM-DD') as date, name, type from holidays where date >= current_date - 30 order by date`,
      ),
    }),
  );
  const groups = [...new Set(SETTINGS.map((s) => s.group))];
  return (
    <div className="grid gap-6">
      {!canEdit && (
        <p className="bg-muted rounded-md p-3 text-sm">
          Solo el administrador puede cambiar parámetros y tarifas.
        </p>
      )}
      {groups.map((g) => (
        <Card key={g}>
          <CardHeader>
            <CardTitle>{g}</CardTitle>
          </CardHeader>
          <CardContent>
            {SETTINGS.filter((s) => s.group === g).map((def) => (
              <SettingRow key={def.key} def={def} value={settings[def.key]} canEdit={canEdit} />
            ))}
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Tarifario (precios sin IGV)</CardTitle>
          <p className="text-muted-foreground text-sm">
            Marca «validado» cuando el precio esté aprobado; los no validados se muestran como
            referenciales.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-2">Tarifa</th>
                <th className="p-2">Precio S/</th>
                <th className="p-2 text-center">Validado</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <RateRow
                  key={r.id}
                  id={r.id}
                  label={`${EVENT_TYPE_LABEL[r.eventType]} · ${DAY[r.dayType]} · ${r.season === "high" ? "alta" : "baja"}`}
                  priceNet={r.priceNet}
                  placeholder={r.placeholder}
                  canEdit={canEdit}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Feriados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <HolidayEditor canEdit={canEdit} />
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {holidays.map((h) => (
              <li key={h.date} className="flex items-center justify-between gap-2 border-b py-1">
                <span>
                  {formatDate(h.date)} · {h.name}
                  {h.type === "no_laborable" && (
                    <span className="text-muted-foreground"> (no laborable)</span>
                  )}
                </span>
                {canEdit && <DeleteHolidayButton date={h.date} />}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Configuración</h1>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <Config />
      </Suspense>
    </div>
  );
}
