import { describe, expect, it } from "vitest";
import { applyDiscount, computeOrderTotal, computeSubtotal, type LineItem } from "./pricing";

const items: LineItem[] = [
  { productId: "p1", unitPriceCents: 1000, quantity: 2 },
  { productId: "p2", unitPriceCents: 250, quantity: 1 },
];

describe("pricing", () => {
  it("sums line items into a subtotal", () => {
    expect(computeSubtotal(items)).toBe(2250);
  });

  it("applies a percentage discount and rounds to the nearest cent", () => {
    expect(applyDiscount(2250, 10)).toBe(2025);
    expect(applyDiscount(999, 33)).toBe(669);
  });

  it("computes an order total from items and a discount", () => {
    expect(computeOrderTotal(items, 10)).toBe(2025);
  });
});
