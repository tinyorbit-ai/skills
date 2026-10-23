fix(pricing): clamp discount percent to [0, 100]

`applyDiscount` trusts `discountPercent` verbatim. A mis-entered value, such as a
promo of `150` or a correction of `-20`, produces a negative or inflated total. The
DB no longer constrains this column, so the guard has to live in the pricing code.

## What

- Clamp `discountPercent` to `[0, 100]` in `applyDiscount` before applying it.
- Add tests for the upper (`150` → full discount) and lower (`-20` → no discount)
  bounds.

<!-- hold-for: orbitcart-design -->
> [!IMPORTANT]
> **Don't merge until @orbitcart-design approves.** Reviewers, hold your approval until then.
