import type { QaCheck } from "../reels/qa";
import { LIMITS, type DesignSpec } from "./spec";

// Control de calidad de piezas gráficas: textos que entran, estructura y veracidad.

const ck = (
  id: string,
  label: string,
  ok: boolean,
  severity: QaCheck["severity"] = "error",
  detail?: string,
): QaCheck => ({
  id,
  label,
  ok,
  severity,
  ...(detail && !ok ? { detail } : {}),
});

export function designQa(spec: DesignSpec): QaCheck[] {
  const checks: QaCheck[] = [];
  const n = spec.slides.length;
  if (spec.format === "carousel") {
    checks.push(
      ck("count", "Carrusel de 3 a 10 láminas", n >= 3 && n <= 10, "error", `${n} láminas`),
      ck("first_cover", "La primera lámina es portada", spec.slides[0].layout === "cover"),
      ck(
        "last_cta",
        "La última lámina es el llamado a la acción",
        spec.slides[n - 1].layout === "cta",
      ),
    );
  } else {
    checks.push(ck("single", "Una sola imagen", n === 1, "error", `${n} imágenes`));
  }
  spec.slides.forEach((s, i) => {
    const max = LIMITS.title[s.layout];
    checks.push(
      ck(
        `title:${i}`,
        `Lámina ${i + 1}: título de ${max} caracteres o menos`,
        s.title.length <= max,
        "error",
        `${s.title.length}`,
      ),
    );
    if ("body" in s && s.body)
      checks.push(
        ck(
          `body:${i}`,
          `Lámina ${i + 1}: texto de ${LIMITS.body} caracteres o menos`,
          s.body.length <= LIMITS.body,
          "error",
          `${s.body.length}`,
        ),
      );
    if (s.layout === "list") {
      checks.push(
        ck(
          `items:${i}`,
          `Lámina ${i + 1}: máximo ${LIMITS.items} puntos`,
          s.items.length <= LIMITS.items,
          "error",
          `${s.items.length}`,
        ),
      );
      s.items.forEach((it, j) =>
        checks.push(
          ck(
            `item:${i}:${j}`,
            `Lámina ${i + 1}, punto ${j + 1}: ${LIMITS.item} caracteres o menos`,
            it.length <= LIMITS.item,
            "error",
            `${it.length}`,
          ),
        ),
      );
    }
  });
  const texts = spec.slides.flatMap((s) => [
    s.title,
    "body" in s ? s.body : "",
    "subtitle" in s ? s.subtitle : "",
    ...("items" in s ? s.items : []),
  ]);
  const unsourced = spec.slides.some(
    (s) =>
      s.layout !== "fact" &&
      /\d/.test([s.title, "body" in s ? s.body : "", ...("items" in s ? s.items : [])].join(" ")),
  );
  checks.push(
    ck(
      "figures",
      "Cifras verificadas contra la web o settings (o en una lámina con fuente)",
      !unsourced,
      "warning",
      "hay números fuera de una lámina con fuente",
    ),
    ck(
      "no_superlatives",
      "Sin superlativos ni urgencia inventada",
      !texts.some((t) =>
        /\b(el mejor|la mejor|los mejores|únic[oa]s? en lima|últimas? fechas|solo hoy)\b/i.test(
          t ?? "",
        ),
      ),
      "error",
    ),
  );
  return checks;
}
