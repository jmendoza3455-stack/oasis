"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelHold } from "@/app/planners/portal/actions";

export function CancelHoldButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await cancelHold(bookingId);
            if (!res.ok) setError(res.error);
          })
        }
      >
        Liberar fecha
      </Button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}
