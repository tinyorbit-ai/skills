refactor(orders): resolve products per line item in listOrdersWithProducts

The batched fetch + `Map` lookup in `listOrdersWithProducts` was doing two things at
once (collect ids, then re-associate). Resolve each line item's product inline
instead — the mapping reads top-to-bottom with no intermediate id set or map.

## What

- Drop the `findProductsByIds` batch and the `productById` map.
- Look up each line item's product with `findProductById` as we build the result.

Behaviour is unchanged: same orders, same totals, same products per order.
