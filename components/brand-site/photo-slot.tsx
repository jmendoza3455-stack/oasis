import Image from "next/image";
import { cn } from "@/lib/utils";

/** Foto provisional rotulada "FOTO PENDIENTE" (nunca una foto ajena presentada como real). */
export function PhotoSlot({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={`${alt} (foto pendiente)`}
      width={1200}
      height={800}
      priority={priority}
      unoptimized
      className={cn("aspect-[3/2] w-full rounded-xl object-cover", className)}
    />
  );
}
