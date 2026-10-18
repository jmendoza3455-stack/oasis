"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { moveLead } from "@/app/admin/crm/actions";

const MANUAL = [
  { key: "new", label: "Nuevo" },
  { key: "contacted", label: "Contactado" },
  { key: "visit_scheduled", label: "Visita agendada" },
  { key: "quoted", label: "Cotizado" },
  { key: "lost", label: "Perdido" },
];

/** Las etapas desde Pre-reserva en adelante las mueve la reserva (no se editan a mano). */
export function LeadStageControl({ id, stage }: { id: string; stage: string }) {
  const [value, setValue] = useState(MANUAL.some((m) => m.key === stage) ? stage : "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!MANUAL.some((m) => m.key === stage) && stage !== "lost") {
    return <p className="text-muted-foreground text-xs">La etapa sigue a la reserva.</p>;
  }
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <NativeSelect aria-label="Etapa" value={value} onChange={(e) => setValue(e.target.value)}>
          {MANUAL.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          disabled={pending || value === stage || (value === "lost" && !reason.trim())}
          onClick={() =>
            start(async () => {
              const res = await moveLead({ id, stage: value, lostReason: reason });
              setError(res.ok ? null : res.error);
            })
          }
        >
          Mover
        </Button>
      </div>
      {value === "lost" && stage !== "lost" && (
        <Input
          aria-label="Motivo de pérdida"
          placeholder="Motivo de pérdida (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
