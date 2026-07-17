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
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

/**
 * Apply a percentage discount to a subtotal and return the result in cents,
 * rounded to the nearest cent. `discountPercent` is clamped to [0, 100] so an
 * out-of-range value can never produce a negative or inflated total.
 */
export function applyDiscount(subtotalCents: number, discountPercent: number): number {
  const clampedPercent = Math.min(100, Math.max(0, discountPercent));
  const discounted = subtotalCents * (1 - clampedPercent / 100);
  return Math.round(discounted);
}

/**
 * Compute the final order total in cents — the subtotal with the discount applied.
 */
export function computeTotal(items: LineItem[], discountPercent: number): number {
  return applyDiscount(computeSubtotal(items), discountPercent);
}
