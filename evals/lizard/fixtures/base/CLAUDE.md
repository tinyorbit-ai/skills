# orbitcart — repo guide

orbitcart is a small order and catalog service. Two domains live under `src/`:
`catalog/` (products) and `orders/` (orders, pricing), backed by a thin `db/` client
seam that tests stub out.

## Review conventions

These are the standards reviewers hold changes to in this repo:

1. **Every exported function has a JSDoc block.** Look at `src/orders/pricing.ts` and
   `src/catalog/catalog.ts` — every `export function` is preceded by a `/** ... */`
   that says what it returns and calls out its edge cases.
2. **Database reads over growing collections are batched, never per-row.** Resolve a
   set of ids with one `... in (...)` query (see `findProductsByIds`), never a query
   per item inside a loop. Orders and products both grow with usage.
3. **Descriptive identifiers.** Parameters and locals are spelled out; single-letter
   names are used only for loop indices. No `s`, `p`, `x` for domain values.

Tests use vitest and live next to the code they cover (`*.test.ts`). A change to an
exported name updates every call site in the same PR (see the Compatibility note in
the README).
