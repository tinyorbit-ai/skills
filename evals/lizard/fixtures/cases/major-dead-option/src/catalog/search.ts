import { getClient } from "../db/client";
import type { Product } from "./catalog";

export interface CatalogSearchInput {
  term: string;
  partialNames?: boolean;
}

export function escapeSearchTerm(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function queryProducts(
  input: CatalogSearchInput,
): Promise<Product[]> {
  const { rows } = await getClient().query<Product>(
    'select id, name, price_cents as "priceCents", active from products where lower(name) = lower($1)',
    [input.term],
  );
  return rows;
}

export function searchProductPicker(term: string): Promise<Product[]> {
  return queryProducts({ term, partialNames: true });
}
