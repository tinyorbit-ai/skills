import { describe, expect, it } from "vitest";
import {
  shouldAutoSelectProduct,
  storefrontCard,
  switcherCard,
} from "./productCard";

describe("product card auto-selection", () => {
  it("selects the highlighted dashboard switcher card", () => {
    expect(shouldAutoSelectProduct(switcherCard)).toBe(true);
  });

  it("does not select a storefront card", () => {
    expect(shouldAutoSelectProduct(storefrontCard)).toBe(false);
  });
});
