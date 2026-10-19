"use client";

import { useTransition } from "react";
import { selectVenue } from "@/app/admin/venue-actions";

/** Selector de local del back-office; con un solo local muestra solo su nombre. */
export function VenueSwitcher({
  venues,
  current,
}: {
  venues: { slug: string; name: string }[];
  current: string;
}) {
  const [pending, start] = useTransition();
  const name = venues.find((v) => v.slug === current)?.name ?? "";
  if (venues.length < 2)
    return <p className="font-display text-sm tracking-[0.12em] uppercase">{name}</p>;
  return (
    <label className="grid gap-1">
      <span className="sr-only">Local</span>
      <select
        aria-label="Local"
        value={current}
        disabled={pending}
        onChange={(e) => start(() => void selectVenue(e.target.value))}
        className="w-full truncate rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm font-medium"
      >
        {venues.map((v) => (
          <option key={v.slug} value={v.slug} className="text-foreground">
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
}
