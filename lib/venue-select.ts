// Elección del local con el que trabaja el back-office (pura, para probarla).

export type VenueRef = { slug: string };

/**
 * El local pedido (cookie) solo si el usuario tiene acceso a él; si no, el local por defecto del
 * despliegue si lo tiene, y si no el primero de los suyos. Null si no tiene ningún local.
 */
export function pickVenue<V extends VenueRef>(
  venues: readonly V[],
  wanted: string | undefined,
  fallbackSlug: string,
): V | null {
  return (
    venues.find((v) => v.slug === wanted) ??
    venues.find((v) => v.slug === fallbackSlug) ??
    venues[0] ??
    null
  );
}
