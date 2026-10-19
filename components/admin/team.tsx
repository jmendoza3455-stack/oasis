"use client";

import { useState, useTransition } from "react";
import { setMemberRole, setVenueAccess, type TeamResult } from "@/app/admin/equipo/actions";

const ROLES = [
  ["none", "Sin acceso"],
  ["ops", "Operaciones"],
  ["admin", "Admin (todos los locales)"],
] as const;

export function MemberControls({
  userId,
  role,
  venues,
  self,
}: {
  userId: string;
  role: "admin" | "ops" | null;
  venues: { id: string; name: string; member: boolean }[];
  self: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<TeamResult | null>(null);
  const run = (fn: () => Promise<TeamResult>) => start(async () => setResult(await fn()));
  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground text-xs">Rol</span>
        <select
          className="bg-background h-9 rounded-md border px-2"
          defaultValue={role ?? "none"}
          disabled={pending || self}
          onChange={(e) =>
            run(() => setMemberRole(userId, e.target.value as "admin" | "ops" | "none"))
          }
        >
          {ROLES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {role === "ops" && (
        <fieldset className="grid gap-1 text-sm">
          <legend className="text-muted-foreground text-xs">Locales donde trabaja</legend>
          {venues.map((v) => (
            <label key={v.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-primary size-4"
                defaultChecked={v.member}
                disabled={pending}
                onChange={(e) => run(() => setVenueAccess(userId, v.id, e.target.checked))}
              />
              {v.name}
            </label>
          ))}
        </fieldset>
      )}
      {result && (
        <p
          role="status"
          className={result.ok ? "text-muted-foreground text-xs" : "text-destructive text-xs"}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
