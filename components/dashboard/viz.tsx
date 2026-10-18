import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { Traffic } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const CHANNEL_VAR = {
  planner: "var(--series-planner)",
  direct: "var(--series-direct)",
  referral: "var(--series-referral)",
  organic: "var(--series-organic)",
} as const;

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 1000) / 10} %`);
export { pct };

const LIGHT: Record<Traffic, { label: string; Icon: typeof CircleCheck; color: string }> = {
  green: { label: "En meta", Icon: CircleCheck, color: "var(--status-good)" },
  yellow: { label: "Cerca de la meta", Icon: TriangleAlert, color: "var(--status-warning)" },
  red: { label: "Debajo de la meta", Icon: CircleAlert, color: "var(--status-critical)" },
};

export function TrafficBadge({ light }: { light: Traffic }) {
  const { label, Icon, color } = LIGHT[light];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <Icon className="size-3.5" aria-hidden /> {label}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  light,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  light?: Traffic;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("bg-card grid content-start gap-1 rounded-xl border p-4", className)}
    >
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-display text-3xl leading-none">{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      {light && <TrafficBadge light={light} />}
    </div>
  );
}

const MONTH = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

/** Barras mensuales de una sola serie (0–100 %). Se usa en small multiples: título = identidad. */
function MonthlyBars({
  title,
  values,
}: {
  title: string;
  values: { month: string; value: number | null; target: number | null }[];
}) {
  const W = 360;
  const H = 150;
  const pad = { l: 32, r: 6, t: 8, b: 20 };
  const cw = (W - pad.l - pad.r) / values.length;
  const bw = Math.min(16, cw - 6);
  const y = (v: number) => pad.t + (1 - v) * (H - pad.t - pad.b);
  return (
    <figure className="grid gap-1">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${title}: ocupación mensual`}
      >
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text
              x={pad.l - 5}
              y={y(g) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--muted-foreground)"
            >
              {g * 100}%
            </text>
          </g>
        ))}
        {values.map((s, i) => {
          const x = pad.l + i * cw + (cw - bw) / 2;
          const h = s.value ? Math.max(2, (H - pad.t - pad.b) * s.value) : 0;
          const label = MONTH[Number(s.month.slice(5, 7)) - 1];
          return (
            <g key={s.month} tabIndex={0} className="outline-none focus:opacity-80">
              <title>{`${label}: ${pct(s.value)}${s.target !== null ? ` · meta ${pct(s.target)}` : ""}`}</title>
              <rect
                x={x - 3}
                y={pad.t}
                width={bw + 6}
                height={H - pad.t - pad.b}
                fill="transparent"
              />
              <rect
                x={x}
                y={H - pad.b - h}
                width={bw}
                height={h}
                rx={h > 4 ? 3 : 0}
                fill="var(--brand-olive)"
              />
              {s.target !== null && (
                <line
                  x1={x - 2}
                  x2={x + bw + 2}
                  y1={y(s.target)}
                  y2={y(s.target)}
                  stroke="var(--foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              )}
              <text
                x={x + bw / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={9}
                fill="var(--muted-foreground)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Ocupación mensual del año como small multiples: V-S-D + feriados y L-J (misma escala). */
export function OccupancyChart({
  series,
}: {
  series: {
    month: string;
    weekend: number | null;
    weekday: number | null;
    targetWeekend: number | null;
    targetWeekday: number | null;
  }[];
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-4 md:grid-cols-2">
        <MonthlyBars
          title="Fin de semana y feriados (V-S-D)"
          values={series.map((s) => ({
            month: s.month,
            value: s.weekend,
            target: s.targetWeekend,
          }))}
        />
        <MonthlyBars
          title="Entre semana (L-J)"
          values={series.map((s) => ({
            month: s.month,
            value: s.weekday,
            target: s.targetWeekday,
          }))}
        />
      </div>
      <p className="text-muted-foreground text-xs">Línea punteada: meta del mes.</p>
      <details className="text-xs">
        <summary className="text-muted-foreground cursor-pointer">Ver tabla</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="p-1">Mes</th>
              <th className="p-1 text-right">V-S-D y feriados</th>
              <th className="p-1 text-right">Meta</th>
              <th className="p-1 text-right">L-J</th>
              <th className="p-1 text-right">Meta</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.month} className="border-t">
                <td className="p-1">{MONTH[Number(s.month.slice(5, 7)) - 1]}</td>
                <td className="p-1 text-right">{pct(s.weekend)}</td>
                <td className="p-1 text-right">{pct(s.targetWeekend)}</td>
                <td className="p-1 text-right">{pct(s.weekday)}</td>
                <td className="p-1 text-right">{pct(s.targetWeekday)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Barra 100 % horizontal (mezcla de canales) con etiquetas directas. */
export function MixBar({
  items,
}: {
  items: { key: keyof typeof CHANNEL_VAR; label: string; value: number }[];
}) {
  const total = items.reduce((a, i) => a + i.value, 0);
  if (total === 0)
    return <p className="text-muted-foreground text-sm">Sin eventos vendidos en el periodo.</p>;
  return (
    <div className="grid gap-2">
      <div
        className="flex h-6 gap-[2px] overflow-hidden rounded-md"
        role="img"
        aria-label="Mezcla de canales"
      >
        {items
          .filter((i) => i.value > 0)
          .map((i) => (
            <div
              key={i.key}
              style={{ width: `${(i.value / total) * 100}%`, background: CHANNEL_VAR[i.key] }}
              title={`${i.label}: ${i.value}`}
            />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: CHANNEL_VAR[i.key] }} />
            {i.label}: <strong>{i.value}</strong> ({Math.round((i.value / total) * 100)} %)
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras horizontales simples (una serie): pipeline por estado. */
export function HBars({
  items,
  format,
}: {
  items: { label: string; value: number; note?: string }[];
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="grid gap-3 text-sm">
      {items.map((i) => (
        <li key={i.label} className="grid gap-1">
          <span className="flex justify-between gap-3">
            <span className="text-muted-foreground">{i.label}</span>
            <span className="shrink-0 tabular-nums">
              {format(i.value)}{" "}
              {i.note && <span className="text-muted-foreground text-xs">{i.note}</span>}
            </span>
          </span>
          <span
            className="bg-brand-olive h-2.5 rounded-r-sm"
            style={{ width: `${(i.value / max) * 100}%`, minWidth: i.value ? 4 : 0 }}
          />
        </li>
      ))}
    </ul>
  );
}
