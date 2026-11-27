feat(checkout): let buyers with one name skip the last name

Some buyers have only one name, and the checkout form refuses them because the last
name is required.

**Issue:** "Buyers with a single name can't complete checkout. Add a 'I only have one
name' option to the checkout form so they can leave the last name blank."

## What

- `CheckoutDetails` gains an optional `singleName` flag.
- `validateCheckoutDetails` skips the last-name check when `singleName` is true. Buyers
  who don't tick it still need a last name, exactly as before.
- Tests for both paths.

This applies to every checkout.
