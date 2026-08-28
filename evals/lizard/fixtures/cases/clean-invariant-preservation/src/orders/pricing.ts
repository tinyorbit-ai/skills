/** A single line on an order: a product, its unit price, and the quantity bought. */
export interface LineItem {
  productId: string;
  unitPriceCents: number;
  quantity: number;
}

/**
 * Sum the line items into a subtotal in cents, before any discount is applied.
 */
export function computeSubtotal(items: LineItem[]): number {
  let subtotalCents = 0;
  for (const item of items) {
    subtotalCents += item.unitPriceCents * item.quantity;
  }
  return subtotalCents;
}

/**
 * Apply a percentage discount to a subtotal and return the result in cents,
 * rounded to the nearest cent.
 */
export function applyDiscount(subtotalCents: number, discountPercent: number): number {
  const discounted = subtotalCents * (1 - discountPercent / 100);
  return Math.round(discounted);
}

/**
 * Compute the final order total in cents — the subtotal with the discount applied.
 */
export function computeTotal(items: LineItem[], discountPercent: number): number {
  return applyDiscount(computeSubtotal(items), discountPercent);
}
