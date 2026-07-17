# orbitcart

A small order and catalog service. orbitcart resolves products, prices orders, and
lists a customer's orders with their line-item products attached.

## Layout

- `src/catalog/` — product lookups (`findProductById`, `findProductsByIds`).
- `src/orders/` — order retrieval (`orders.ts`) and pricing (`pricing.ts`).
- `src/db/` — a thin query client seam the repositories share.
- `migrations/` — SQL schema for products and orders.

## Design notes

Repositories never talk to a driver directly; they receive a `DbClient` through
`configureClient` so tests can substitute a stub. Catalog and orders are kept
separate so a change to pricing never reaches product storage.

When a query touches a collection that grows with usage, it is batched — see
`findProductsByIds`, which resolves any number of ids in one round trip. This keeps
list endpoints fast even after a customer has placed many orders.

## Compatibility

The public surface is re-exported from `src/index.ts`. Changing an exported name is a
breaking change for consumers; if a rename is needed, every call site must be updated
in the same change so no stale import is left once the rename has occurred.
