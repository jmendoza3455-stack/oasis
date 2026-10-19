"use client";

import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

/** Antes y después de la obra con un deslizador (teclado: flechas). */
export function BeforeAfter({
  before,
  after,
  label,
}: {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  label: string;
}) {
  return (
    <figure className="grid gap-2">
      <ReactCompareSlider
        aria-label={label}
        className="aspect-[3/2] overflow-hidden rounded-xl"
        itemOne={<ReactCompareSliderImage src={before.src} alt={before.alt} />}
        itemTwo={<ReactCompareSliderImage src={after.src} alt={after.alt} />}
      />
      <figcaption className="text-muted-foreground text-sm">
        Desliza para comparar · {label}
      </figcaption>
    </figure>
  );
}
