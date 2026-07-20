export { findOrdersByCustomer, listOrdersWithProducts } from "./orders/orders";
export type { Order, OrderWithProducts } from "./orders/orders";
export {
  findProductById,
  findProductsByIds,
  PRODUCT_SEARCH_LIMIT,
  searchProducts,
} from "./catalog/catalog";
export type { Product } from "./catalog/catalog";
export { configureClient } from "./db";
export type { DbClient } from "./db";
