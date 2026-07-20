import { getClient } from "../db/client";

/** A product available for purchase in the catalog. */
export interface Product {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
}

const SELECT_COLUMNS = 'id, name, price_cents as "priceCents", active';

/** The hard cap on rows any product search may return. */
export const PRODUCT_SEARCH_LIMIT = 20;

/**
 * Fetch a single product by id, or null when no product with that id exists.
 */
export async function findProductById(id: string): Promise<Product | null> {
  const { rows } = await getClient().query<Product>(
    `select ${SELECT_COLUMNS} from products where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Fetch many products in a single round trip. Ids missing from the catalog are
 * simply absent from the result; the order of the returned rows is not guaranteed.
 */
export async function findProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");
  const { rows } = await getClient().query<Product>(
    `select ${SELECT_COLUMNS} from products where id in (${placeholders})`,
    ids,
  );
  return rows;
}

/**
 * Search active products by a case-insensitive substring of their name.
 *
 * An empty or whitespace-only term matches nothing and costs no query. The term is
 * escaped, so `%` and `_` typed by a user match literally instead of behaving as
 * wildcards. The cap lives here rather than in the caller's hands, so no caller can
 * request an unbounded page, and no total count is computed.
 */
export async function searchProducts(searchTerm: string): Promise<Product[]> {
  const trimmedTerm = searchTerm.trim();
  if (trimmedTerm === "") return [];
  const escapedTerm = trimmedTerm.replace(/([\\%_])/g, "\\$1");
  const { rows } = await getClient().query<Product>(
    `select ${SELECT_COLUMNS} from products
      where active and name ilike '%' || $1 || '%' escape '\\'
      order by name
      limit ${PRODUCT_SEARCH_LIMIT}`,
    [escapedTerm],
  );
  return rows;
}
