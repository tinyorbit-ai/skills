feat(catalog): add productLabel helper

Small display helper that formats a product as `"<name> ($<dollars>)"` for order
summaries and receipts. Pure function, covered by a unit test.

## What

- Add `productLabel(product)` to `src/catalog/catalog.ts`.
- Cover it in `catalog.test.ts`.
