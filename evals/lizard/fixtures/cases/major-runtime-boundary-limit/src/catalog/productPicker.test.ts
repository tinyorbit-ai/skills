import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./listProductsAction", () => ({
  listProductsAction: { execute: vi.fn() },
}));

import { listProductsAction } from "./listProductsAction";
import {
  loadProductPickerOptions,
  STATIC_PICKER_OPTION_LIMIT,
} from "./productPicker";

describe("loadProductPickerOptions", () => {
  beforeEach(() => {
    vi.mocked(listProductsAction.execute).mockReset();
  });

  it("fills the static picker to its option limit", async () => {
    vi.mocked(listProductsAction.execute).mockResolvedValue(
      Array.from({ length: STATIC_PICKER_OPTION_LIMIT }, (_, index) => ({
        id: `p${index + 1}`,
        name: `Product ${index + 1}`,
        priceCents: 500,
        active: true,
      })),
    );

    await expect(loadProductPickerOptions()).resolves.toHaveLength(100);
    expect(listProductsAction.execute).toHaveBeenCalledWith({ limit: 100 });
  });
});
