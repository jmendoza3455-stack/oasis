"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmClipUpload,
  decidePiece,
  publishPiece,
  requestClipUpload,
  savePieceMetrics,
  type MarketingResult,
} from "@/app/admin/marketing/actions";

type Job = {
  name: string;
  progress: number;
  status: "subiendo" | "listo" | "error";
  message?: string;
};

/** Sube con progreso (XHR: fetch no informa avance de subida). */
function put(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("red"));
    xhr.send(file);
  });
}

/** Subida de clips desde el celular, directo al almacenamiento (hasta 50 MB por archivo). */
export function ClipUploader() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notes, setNotes] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const update = (i: number, patch: Partial<Job>) =>
    setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)));

  const upload = async (files: FileList) => {
    const list = [...files];
    const offset = jobs.length;
    setJobs((js) => [
      ...js,
      ...list.map((f) => ({ name: f.name, progress: 0, status: "subiendo" as const })),
    ]);
    for (const [i, file] of list.entries()) {
      const idx = offset + i;
      const meta = { filename: file.name, type: file.type, size: file.size };
      const target = await requestClipUpload(meta);
      if (!target.ok) {
        update(idx, { status: "error", message: target.message });
        continue;
      }
      try {
        await put(target.url, file, (p) => update(idx, { progress: p }));
        const res = await confirmClipUpload({ ...meta, key: target.key, notes });
        update(
          idx,
          res.ok ? { status: "listo", progress: 1 } : { status: "error", message: res.message },
        );
      } catch {
        update(idx, { status: "error", message: "Se cortó la subida. Inténtalo con wifi." });
      }
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor="clip-notes">¿Qué muestran? (opcional)</Label>
        <Input
          id="clip-notes"
          value={notes}
          maxLength={300}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Toma 9: antes/después de la piscina, 8 a. m."
        />
      </div>
      <label
        htmlFor="clip-files"
        className="hover:bg-muted flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center"
      >
        <Upload className="size-6" aria-hidden />
        <span className="font-medium">Subir clips o fotos</span>
        <span className="text-muted-foreground text-xs">
          Celular en vertical, 1080p · MP4, MOV, JPG o PNG · hasta 50 MB cada uno
        </span>
      </label>
      <input
        ref={input}
        id="clip-files"
        type="file"
        accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />
      {jobs.length > 0 && (
        <ul className="grid gap-2 text-sm" aria-live="polite">
          {jobs.map((j, i) => (
            <li key={`${j.name}-${i}`} className="grid gap-1">
              <div className="flex justify-between gap-2">
                <span className="truncate">{j.name}</span>
                <span
                  className={j.status === "error" ? "text-destructive" : "text-muted-foreground"}
                >
                  {j.status === "subiendo"
                    ? `${Math.round(j.progress * 100)} %`
                    : j.status === "listo"
                      ? "Listo"
                      : j.message}
                </span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className={
                    j.status === "error"
                      ? "bg-destructive h-full"
                      : "bg-primary h-full transition-[width]"
                  }
                  style={{ width: `${Math.round(j.progress * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "Copiar caption" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {done ? "Copiado" : label}
    </Button>
  );
}

function Result({ state }: { state: MarketingResult | null }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={state.ok ? "text-muted-foreground text-sm" : "text-destructive text-sm"}
    >
      {state.message}
    </p>
  );
}

/** Aprobar, pedir cambios o descartar una pieza en revisión. */
export function PieceDecision({ id }: { id: string }) {
  const [state, action, pending] = useActionState<MarketingResult | null, FormData>(
    decidePiece,
    null,
  );
  const [changes, setChanges] = useState(false);
  return (
    <form action={action} className="grid gap-2" aria-label="Decidir pieza">
      <input type="hidden" name="id" value={id} />
      {changes && (
        <div className="grid gap-1">
          <Label htmlFor={`fb-${id}`}>¿Qué cambiar?</Label>
          <Textarea
            id={`fb-${id}`}
            name="feedback"
            required
            maxLength={1000}
            rows={3}
            placeholder="Gancho más corto; usar la toma de la piscina al inicio"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!changes ? (
          <>
            <Button type="submit" name="decision" value="approved" disabled={pending}>
              Aprobar
            </Button>
            <Button type="button" variant="outline" onClick={() => setChanges(true)}>
              Pedir cambios
            </Button>
            <Button
              type="submit"
              name="decision"
              value="discarded"
              variant="ghost"
              disabled={pending}
            >
              Descartar
            </Button>
          </>
        ) : (
          <>
            <Button type="submit" name="decision" value="changes" disabled={pending}>
              Enviar cambios
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChanges(false)}>
              Volver
            </Button>
          </>
        )}
      </div>
      <Result state={state} />
    </form>
  );
}

const NETWORKS = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["google", "Google Business"],
] as const;

/** Marca como publicada con los enlaces de cada red. */
export function PublishForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<MarketingResult | null, FormData>(
    publishPiece,
    null,
  );
  return (
    <form action={action} className="grid gap-2" aria-label="Marcar publicada">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-2">
        {NETWORKS.map(([k, label]) => (
          <div key={k} className="grid gap-1">
            <Label htmlFor={`${k}-${id}`}>Enlace en {label}</Label>
            <Input id={`${k}-${id}`} name={k} type="url" inputMode="url" placeholder="https://" />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        Marcar publicada
      </Button>
      <Result state={state} />
    </form>
  );
}

const METRICS = [
  ["reach", "Alcance"],
  ["views", "Reproducciones"],
  ["skip_rate", "Tasa de salto %"],
  ["saves", "Guardados"],
  ["shares", "Compartidos"],
  ["link_clicks", "Clics al link"],
] as const;

/** Resultados a los 7 días (de las estadísticas de cada red). */
export function MetricsForm({ id, metrics }: { id: string; metrics: Record<string, number> }) {
  const [state, action, pending] = useActionState<MarketingResult | null, FormData>(
    savePieceMetrics,
    null,
  );
  return (
    <form action={action} className="grid gap-2" aria-label="Resultados">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {METRICS.map(([k, label]) => (
          <div key={k} className="grid gap-1">
            <Label htmlFor={`${k}-${id}`} className="text-xs">
              {label}
            </Label>
            <Input
              id={`${k}-${id}`}
              name={k}
              type="number"
              min={0}
              {...(k === "skip_rate"
                ? { max: 100, step: 0.1, inputMode: "decimal" as const }
                : { inputMode: "numeric" as const })}
              defaultValue={metrics[k] ?? ""}
            />
          </div>
        ))}
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="w-fit">
        Guardar resultados
      </Button>
      <Result state={state} />
    </form>
  );
}
