import { findProductsByIds, type Product } from "../catalog/catalog";
import { getClient } from "../db/client";
import { computeTotal, type LineItem } from "./pricing";

/** A stored order and its line items. */
export interface Order {
  id: string;
  customerId: string;
  items: LineItem[];
  discountPercent: number;
}

/** An order with its computed total and the products for each line item resolved. */
export interface OrderWithProducts {
  order: Order;
  totalCents: number;
  products: Product[];
}

/**
 * Load every order belonging to a customer.
 */
export async function findOrdersByCustomer(customerId: string): Promise<Order[]> {
  const { rows } = await getClient().query<Order>(
    'select id, customer_id as "customerId", items, discount_percent as "discountPercent" from orders where customer_id = $1',
    [customerId],
  );
  return rows;
}

/**
 * List a customer's orders with each line item's product resolved and the order
 * total computed. Products are fetched with one batched query so the number of
 * database round trips does not grow with the number of orders.
 */
export async function listOrdersWithProducts(customerId: string): Promise<OrderWithProducts[]> {
  const orders = await findOrdersByCustomer(customerId);
  const productIds = [
    ...new Set(orders.flatMap((order) => order.items.map((item) => item.productId))),
  ];
  const products = await findProductsByIds(productIds);
  const productById = new Map(products.map((product) => [product.id, product]));

  return orders.map((order) => ({
    order,
    totalCents: computeTotal(order.items, order.discountPercent),
    products: order.items
      .map((item) => productById.get(item.productId))
      .filter((product): product is Product => product !== undefined),
  }));
}
