export interface CatalogEvent {
  id: string;
  occurrenceId?: string;
}

export type CatalogRouteResult =
  | { kind: "render" }
  | { kind: "redirect"; occurrenceId: string }
  | { kind: "not-found" };

export function resolveLegacyCatalogRoute(
  event: CatalogEvent,
): CatalogRouteResult {
  return event.occurrenceId
    ? { kind: "redirect", occurrenceId: event.occurrenceId }
    : { kind: "render" };
}

export function resolveAppCatalogRoute(
  event: CatalogEvent,
): CatalogRouteResult {
  return event.occurrenceId
    ? { kind: "redirect", occurrenceId: event.occurrenceId }
    : { kind: "not-found" };
}
