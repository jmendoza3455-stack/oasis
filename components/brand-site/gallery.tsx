"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export type GalleryPhoto = { src: string; alt: string };

/** Galería con vista ampliada (teclado, deslizar en celular y cerrar con Esc). */
export function Gallery({ photos, label }: { photos: GalleryPhoto[]; label: string }) {
  const [index, setIndex] = useState(-1);
  return (
    <>
      <ul aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p, i) => (
          <li key={p.src} className={i === 0 ? "col-span-2 row-span-2" : undefined}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="focus-visible:ring-ring block w-full overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`Ampliar: ${p.alt}`}
            >
              <Image
                src={p.src}
                alt={p.alt}
                width={1200}
                height={800}
                unoptimized
                className="aspect-[3/2] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              />
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={photos.map((p) => ({ src: p.src, alt: p.alt, width: 1200, height: 800 }))}
        labels={{ Previous: "Anterior", Next: "Siguiente", Close: "Cerrar", Lightbox: "Galería" }}
      />
    </>
  );
}
