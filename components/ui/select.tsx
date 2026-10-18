import * as React from "react";
import { cn } from "@/lib/utils";

// Select nativo: accesible y sin JS en móvil.
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 flex h-10 w-full rounded-md border px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
