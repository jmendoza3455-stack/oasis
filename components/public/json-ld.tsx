import type { Thing, WithContext } from "schema-dts";
import { jsonLdString } from "@/lib/content/seo";

/** Datos estructurados de schema.org para buscadores. */
export function JsonLd({ data }: { data: WithContext<Thing> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
  );
}
