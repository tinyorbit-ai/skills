fix(pricing): clamp discount percent to [0, 100]

`applyDiscount` trusts `discountPercent` verbatim. A mis-entered value — a promo of
`150` or a negative correction of `-20` — produces a negative or inflated total
instead of a sensible one. The DB no longer constrains this column, so the guard has
to live in the pricing code.

## What

- Clamp `discountPercent` to `[0, 100]` in `applyDiscount` before applying it.
- Add tests covering both the upper (`150` → full discount) and lower (`-20` → no
  discount) bounds.

No change to the happy path: an in-range discount computes exactly as before.
