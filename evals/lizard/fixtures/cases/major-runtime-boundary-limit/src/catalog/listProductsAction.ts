import { z } from "zod";
import { getClient } from "../db/client";
import type { Product } from "./catalog";

/** The largest product page the shared action permits. */
export const PRODUCT_ACTION_LIMIT = 40;

/** Runtime contract for callers of the product-list action. */
export const listProductsInputSchema = z.object({
  limit: z.number().int().min(1).max(PRODUCT_ACTION_LIMIT),
});

export type ListProductsInput = z.input<typeof listProductsInputSchema>;

/** Load a bounded page of active products after validating the caller's input. */
export const listProductsAction = {
  async execute(input: ListProductsInput): Promise<Product[]> {
    const { limit } = listProductsInputSchema.parse(input);
    const { rows } = await getClient().query<Product>(
      'select id, name, price_cents as "priceCents", active from products where active = true limit $1',
      [limit],
    );
    return rows;
  },
};
