"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SettingDef } from "@/lib/content/settings-schema";
import {
  addHoliday,
  deleteHoliday,
  saveRate,
  saveSetting,
} from "@/app/admin/configuracion/actions";

function display(def: SettingDef, value: unknown) {
  if (value === undefined || value === null) return "";
  if (def.type === "percent") return String(Math.round(Number(value) * 10000) / 100);
  if (def.type === "json") return JSON.stringify(value);
  return String(value);
}

export function SettingRow({
  def,
  value,
  canEdit,
}: {
  def: SettingDef;
  value: unknown;
  canEdit: boolean;
}) {
  const [raw, setRaw] = useState(display(def, value));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const id = `s-${def.key}`;
  const Field = def.type === "json" ? Textarea : Input;
  return (
    <div className="grid gap-2 border-b py-3 md:grid-cols-[1fr_1.4fr_auto] md:items-center">
      <label htmlFor={id} className="text-sm">
        {def.label}
        {def.help && <span className="text-muted-foreground block text-xs">{def.help}</span>}
      </label>
      {def.type === "boolean" ? (
        <select
          id={id}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={!canEdit}
          className="border-input bg-card h-10 rounded-md border px-3 text-sm"
        >
          <option value="false">No</option>
          <option value="true">Sí</option>
        </select>
      ) : (
        <Field
          id={id}
          value={raw}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            setRaw(e.target.value)
          }
          disabled={!canEdit}
          type={
            def.type === "date"
              ? "date"
              : def.type === "json" || def.type === "text"
                ? undefined
                : "number"
          }
          step={def.type === "percent" ? "0.01" : undefined}
          rows={def.type === "json" ? 2 : undefined}
          className={def.type === "json" ? "font-mono text-xs" : undefined}
        />
      )}
      <div className="flex items-center gap-2">
        {def.type === "percent" && <span className="text-muted-foreground text-sm">%</span>}
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending || raw === display(def, value)}
            onClick={() =>
              start(async () => {
                const res = await saveSetting(def.key, raw);
                setMsg(res.ok ? { ok: true, text: "Guardado" } : { ok: false, text: res.error });
              })
            }
          >
            Guardar
          </Button>
        )}
        {msg && (
          <span
            className={
              msg.ok ? "text-brand-olive dark:text-brand-camel text-xs" : "text-destructive text-xs"
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

export function RateRow({
  id,
  label,
  priceNet,
  placeholder,
  canEdit,
}: {
  id: string;
  label: string;
  priceNet: number;
  placeholder: boolean;
  canEdit: boolean;
}) {
  const [price, setPrice] = useState(String(priceNet));
  const [validated, setValidated] = useState(!placeholder);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = price !== String(priceNet) || validated === placeholder;
  return (
    <tr className="border-t">
      <td className="p-2 text-sm">{label}</td>
      <td className="p-2">
        <Input
          aria-label={`Precio sin IGV ${label}`}
          type="number"
          min={0}
          step="50"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            setSaved(false);
          }}
          disabled={!canEdit}
          className="h-8 w-28"
        />
      </td>
      <td className="p-2 text-center">
        <input
          type="checkbox"
          aria-label={`Precio validado ${label}`}
          checked={validated}
          disabled={!canEdit}
          onChange={(e) => {
            setValidated(e.target.checked);
            setSaved(false);
          }}
        />
      </td>
      <td className="p-2">
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const res = await saveRate({ id, priceNet: Number(price), validated });
                setSaved(res.ok);
              })
            }
          >
            {saved ? <Check className="size-4" aria-label="Guardado" /> : "Guardar"}
          </Button>
        )}
      </td>
    </tr>
  );
}

export function HolidayEditor({ canEdit }: { canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return null;
  return (
    <form
      className="flex flex-wrap gap-2"
      action={(fd) =>
        start(async () => {
          const res = await addHoliday({
            date: String(fd.get("date")),
            name: String(fd.get("name")),
          });
          setError(res.ok ? null : res.error);
        })
      }
    >
      <Input name="date" type="date" aria-label="Fecha del feriado" className="w-44" required />
      <Input
        name="name"
        aria-label="Nombre del feriado"
        placeholder="Nombre"
        className="w-56"
        required
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Agregar feriado
      </Button>
      {error && <span className="text-destructive text-sm">{error}</span>}
    </form>
  );
}

export function DeleteHolidayButton({ date }: { date: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(async () => void (await deleteHoliday(date)))}
    >
      Quitar
    </Button>
  );
}
