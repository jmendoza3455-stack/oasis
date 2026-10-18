"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COST_LABEL, type ChecklistKind, type CostCategory } from "@/lib/content/operations";
import { formatPEN } from "@/lib/domain";
import {
  addActaPhotos,
  addIncident,
  saveChecklist,
  saveEventCosts,
  type OpsResult,
} from "@/app/admin/reservas/[id]/operacion/actions";
import { resolveGuarantee } from "@/app/admin/reservas/[id]/money-actions";

type Item = { label: string; done: boolean };

export function ChecklistEditor({
  bookingId,
  kind,
  title,
  initial,
  completedAt,
}: {
  bookingId: string;
  kind: ChecklistKind;
  title: string;
  initial: Item[];
  completedAt: string | null;
}) {
  const [items, setItems] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = (complete: boolean) =>
    start(async () => {
      const res = await saveChecklist({ bookingId, kind, items, complete });
      setMsg(res.ok ? (complete ? "Cerrado" : "Guardado") : res.error);
    });
  return (
    <fieldset className="grid gap-2 rounded-lg border p-3" aria-label={title}>
      <legend className="px-1 text-sm font-medium">
        {title} {completedAt && <span className="text-brand-olive text-xs">· cerrado</span>}
      </legend>
      {items.map((it, i) => (
        <label key={it.label} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={it.done}
            disabled={!!completedAt}
            onChange={(e) =>
              setItems(items.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))
            }
          />
          {it.label}
        </label>
      ))}
      {!completedAt && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => save(false)}>
            Guardar avance
          </Button>
          <Button
            size="sm"
            disabled={pending || items.some((i) => !i.done)}
            onClick={() => save(true)}
          >
            Cerrar {title}
          </Button>
          {msg && <span className="text-muted-foreground text-xs">{msg}</span>}
        </div>
      )}
    </fieldset>
  );
}

function useResetOnOk(state: OpsResult | null) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return form;
}

export function ActaPhotos({
  bookingId,
  photos,
}: {
  bookingId: string;
  photos: { url: string }[];
}) {
  const [state, action, pending] = useActionState<OpsResult | null, FormData>(addActaPhotos, null);
  const form = useResetOnOk(state);
  return (
    <div className="grid gap-3">
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <li key={p.url}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                Foto {i + 1}
              </a>
            </li>
          ))}
        </ul>
      )}
      <form
        ref={form}
        action={action}
        className="flex flex-wrap items-end gap-2"
        aria-label="Fotos del acta"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <div className="grid gap-1">
          <Label htmlFor="acta-photos">Fotos de entrega / recepción</Label>
          <Input
            id="acta-photos"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Subir fotos
        </Button>
        {state && !state.ok && <span className="text-destructive text-sm">{state.error}</span>}
      </form>
    </div>
  );
}

export function Incidents({
  bookingId,
  incidents,
  isAdmin,
  guaranteeHeld,
}: {
  bookingId: string;
  incidents: { id: string; description: string; amount: number; chargeToGuarantee: boolean }[];
  isAdmin: boolean;
  guaranteeHeld: boolean;
}) {
  const [state, action, pending] = useActionState<OpsResult | null, FormData>(addIncident, null);
  const form = useResetOnOk(state);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const charged = incidents.filter((i) => i.chargeToGuarantee).reduce((a, i) => a + i.amount, 0);
  return (
    <div className="grid gap-3">
      {incidents.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin incidencias.</p>
      ) : (
        <ul className="divide-y text-sm">
          {incidents.map((i) => (
            <li key={i.id} className="flex justify-between gap-2 py-2">
              <span>{i.description}</span>
              <span>
                {formatPEN(i.amount)}{" "}
                {i.chargeToGuarantee && (
                  <span className="text-destructive text-xs">· a la garantía</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {isAdmin && guaranteeHeld && charged > 0 && (
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const res = await resolveGuarantee({
                bookingId,
                action: "partially_applied",
                deductions: charged,
                notes: "Cargos por incidencias",
              });
              setMsg(res.ok ? "Garantía aplicada" : res.error);
            })
          }
        >
          Descontar {formatPEN(charged)} de la garantía
        </Button>
      )}
      {msg && <p className="text-sm">{msg}</p>}
      <form
        ref={form}
        action={action}
        className="grid gap-2 rounded-lg border p-3"
        aria-label="Registrar incidencia"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <div className="grid gap-1">
          <Label htmlFor="inc-desc">Incidencia o daño</Label>
          <Textarea id="inc-desc" name="description" rows={2} required />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor="inc-amount">Monto S/</Label>
            <Input
              id="inc-amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              className="w-32"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="chargeToGuarantee" /> Cargar a la garantía
          </label>
          <Input
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            aria-label="Fotos de la incidencia"
            className="w-56"
          />
        </div>
        {state && !state.ok && <p className="text-destructive text-sm">{state.error}</p>}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Registrar incidencia
        </Button>
      </form>
    </div>
  );
}

export function CostsEditor({
  bookingId,
  rows,
}: {
  bookingId: string;
  rows: { category: CostCategory; standard: number; actual: number | null }[];
}) {
  const [values, setValues] = useState(rows);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = (k: "standard" | "actual") => values.reduce((a, r) => a + (r[k] ?? 0), 0);
  return (
    <div className="grid gap-2">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground text-left text-xs">
          <tr>
            <th className="py-1">Concepto</th>
            <th className="py-1">Estándar S/</th>
            <th className="py-1">Real S/</th>
          </tr>
        </thead>
        <tbody>
          {values.map((r, i) => (
            <tr key={r.category} className="border-t">
              <td className="py-1">{COST_LABEL[r.category]}</td>
              <td className="py-1">
                <Input
                  aria-label={`Costo estándar ${COST_LABEL[r.category]}`}
                  type="number"
                  min={0}
                  className="h-8 w-24"
                  value={r.standard}
                  onChange={(e) =>
                    setValues(
                      values.map((x, j) =>
                        j === i ? { ...x, standard: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
              </td>
              <td className="py-1">
                <Input
                  aria-label={`Costo real ${COST_LABEL[r.category]}`}
                  type="number"
                  min={0}
                  className="h-8 w-24"
                  value={r.actual ?? ""}
                  onChange={(e) =>
                    setValues(
                      values.map((x, j) =>
                        j === i
                          ? { ...x, actual: e.target.value === "" ? null : Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
              </td>
            </tr>
          ))}
          <tr className="border-t font-medium">
            <td className="py-1">Total</td>
            <td className="py-1">{formatPEN(total("standard"))}</td>
            <td className="py-1">{formatPEN(total("actual"))}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveEventCosts({ bookingId, rows: values });
              setMsg(res.ok ? "Costos guardados" : res.error);
            })
          }
        >
          Guardar costos
        </Button>
        {msg && <span className="text-muted-foreground text-xs">{msg}</span>}
      </div>
    </div>
  );
}
