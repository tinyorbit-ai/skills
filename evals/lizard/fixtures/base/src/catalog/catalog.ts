import { getClient } from "../db/client";

/** A product available for purchase in the catalog. */
export interface Product {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
}

const SELECT_COLUMNS = 'id, name, price_cents as "priceCents", active';

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
