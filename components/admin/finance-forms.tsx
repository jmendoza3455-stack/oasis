"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import {
  addCampaign,
  addCapex,
  addFixedCost,
  addSpend,
  importHistorical,
  importSpendCsv,
  type FinanceResult,
} from "@/app/admin/finanzas/actions";

function Result({ state }: { state: FinanceResult | null }) {
  if (!state) return null;
  return (
    <div className="text-sm" role="status">
      {state.message && (
        <p className={state.ok ? "text-brand-olive" : "text-destructive"}>{state.message}</p>
      )}
      {state.errors && state.errors.length > 0 && (
        <ul className="text-destructive mt-1 list-disc pl-5 text-xs">
          {state.errors.slice(0, 10).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useForm(fn: (s: FinanceResult | null, f: FormData) => Promise<FinanceResult>) {
  return useActionState<FinanceResult | null, FormData>(fn, null);
}

export function CampaignForm() {
  const [state, action, pending] = useForm(addCampaign);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-4" aria-label="Nueva campaña">
      <Input name="name" placeholder="Nombre" aria-label="Nombre de la campaña" required />
      <Input
        name="utmCampaign"
        placeholder="utm_campaign"
        aria-label="Código utm_campaign"
        required
      />
      <NativeSelect name="platform" aria-label="Plataforma" defaultValue="meta">
        <option value="meta">Meta</option>
        <option value="google">Google</option>
        <option value="tiktok">TikTok</option>
        <option value="directory">Directorio</option>
        <option value="other">Otro</option>
      </NativeSelect>
      <Button type="submit" variant="outline" disabled={pending}>
        Crear campaña
      </Button>
      <div className="sm:col-span-4">
        <Result state={state} />
      </div>
    </form>
  );
}

export function SpendForm({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const [state, action, pending] = useForm(addSpend);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-4" aria-label="Inversión mensual">
      <NativeSelect name="campaignId" aria-label="Campaña">
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
      <Input name="month" type="month" aria-label="Mes" required />
      <Input
        name="amount"
        type="number"
        step="0.01"
        min={0}
        placeholder="S/"
        aria-label="Monto invertido"
        required
      />
      <Button type="submit" variant="outline" disabled={pending}>
        Registrar inversión
      </Button>
      <div className="sm:col-span-4">
        <Result state={state} />
      </div>
    </form>
  );
}

export function SpendCsvForm() {
  const [state, action, pending] = useForm(importSpendCsv);
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2"
      aria-label="Importar inversión CSV"
    >
      <div className="grid gap-1">
        <Label htmlFor="csv-platform">Origen</Label>
        <NativeSelect id="csv-platform" name="platform" defaultValue="meta" className="w-36">
          <option value="meta">Meta Ads</option>
          <option value="google">Google Ads</option>
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="csv-file">Archivo CSV exportado</Label>
        <Input id="csv-file" name="file" type="file" accept=".csv,text/csv" required />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        Importar
      </Button>
      <div className="w-full">
        <Result state={state} />
      </div>
    </form>
  );
}

export function FixedCostForm() {
  const [state, action, pending] = useForm(addFixedCost);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-4" aria-label="Costo fijo">
      <Input name="month" type="month" aria-label="Mes del costo" required />
      <NativeSelect name="category" aria-label="Categoría" defaultValue="caretaker">
        <option value="caretaker">Guardianía</option>
        <option value="gardening">Jardinería</option>
        <option value="pool">Piscina</option>
        <option value="utilities">Servicios</option>
        <option value="insurance">Seguros</option>
        <option value="internet">Internet</option>
        <option value="other">Otros</option>
      </NativeSelect>
      <Input
        name="amount"
        type="number"
        step="0.01"
        min={0}
        placeholder="S/"
        aria-label="Monto del costo"
        required
      />
      <Button type="submit" variant="outline" disabled={pending}>
        Guardar costo
      </Button>
      <div className="sm:col-span-4">
        <Result state={state} />
      </div>
    </form>
  );
}

export function CapexForm() {
  const [state, action, pending] = useForm(addCapex);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-4" aria-label="CAPEX">
      <Input
        name="description"
        placeholder="Descripción"
        aria-label="Descripción de la inversión"
        required
      />
      <Input
        name="amount"
        type="number"
        step="0.01"
        min={0}
        placeholder="S/"
        aria-label="Monto de la inversión"
        required
      />
      <Input name="spentOn" type="date" aria-label="Fecha de la inversión" required />
      <Button type="submit" variant="outline" disabled={pending}>
        Registrar CAPEX
      </Button>
      <div className="sm:col-span-4">
        <Result state={state} />
      </div>
    </form>
  );
}

export function HistoricalImportForm() {
  const [state, action, pending] = useForm(importHistorical);
  return (
    <form action={action} className="grid gap-2" aria-label="Importar eventos históricos">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="hist-file">CSV de eventos realizados</Label>
          <Input id="hist-file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Importando…" : "Importar histórico"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  );
}
