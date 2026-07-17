refactor(pricing): rename computeTotal to computeOrderTotal

`computeTotal` is ambiguous next to `computeSubtotal` — both "totals". Rename it to
`computeOrderTotal` so the order-level total reads clearly at every call site.

## What

- Rename the exported `computeTotal` to `computeOrderTotal` in `src/orders/pricing.ts`.
- Update every call site and the pricing tests to the new name.

Mechanical rename, no behaviour change.
