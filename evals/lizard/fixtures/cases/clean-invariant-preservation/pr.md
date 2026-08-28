refactor(pricing): make subtotal accumulation explicit

The subtotal now uses a direct loop instead of a reducer. This preserves current
behavior for empty and populated carts while keeping integer-cent accumulation easy
to follow. Existing pricing tests cover subtotal, discount, and total behavior.
