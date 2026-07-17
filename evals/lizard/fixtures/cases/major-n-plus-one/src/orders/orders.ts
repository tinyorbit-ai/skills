import { findProductById, type Product } from "../catalog/catalog";
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
 * total computed.
 */
export async function listOrdersWithProducts(customerId: string): Promise<OrderWithProducts[]> {
  const orders = await findOrdersByCustomer(customerId);
  const result: OrderWithProducts[] = [];

  for (const order of orders) {
    const products: Product[] = [];
    for (const item of order.items) {
      const product = await findProductById(item.productId);
      if (product !== null) products.push(product);
    }
    result.push({
      order,
      totalCents: computeTotal(order.items, order.discountPercent),
      products,
    });
  }

  return result;
}
