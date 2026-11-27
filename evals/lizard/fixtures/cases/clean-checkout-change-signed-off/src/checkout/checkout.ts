import { randomUUID } from "node:crypto";
import { getClient } from "../db/client";
import { computeTotal, type LineItem } from "../orders/pricing";

/** The buyer details every customer enters on the checkout form. */
export interface CheckoutDetails {
  firstName: string;
  lastName: string;
  email: string;
  /** The buyer has only one name, so the last name may be left blank. */
  singleName?: boolean;
}

/**
 * Validate the checkout form and return one message per problem; an empty list means
 * the details can be submitted. Every customer's checkout goes through this check.
 */
export function validateCheckoutDetails(details: CheckoutDetails): string[] {
  const errors: string[] = [];
  if (details.firstName.trim() === "") errors.push("First name is required");
  if (details.lastName.trim() === "" && details.singleName !== true) {
    errors.push("Last name is required");
  }
  if (!details.email.includes("@")) errors.push("Enter a valid email address");
  return errors;
}

/**
 * Place an order for a customer once the checkout form is valid. Returns the new
 * order's id, or the validation messages when the details are not accepted.
 */
export async function placeOrder(
  customerId: string,
  items: LineItem[],
  details: CheckoutDetails,
): Promise<{ orderId: string } | { errors: string[] }> {
  const errors = validateCheckoutDetails(details);
  if (errors.length > 0) return { errors };
  const { rows } = await getClient().query<{ id: string }>(
    "insert into orders (id, customer_id, items, discount_percent, buyer_first_name, buyer_last_name, buyer_email, total_cents) values ($1, $2, $3, 0, $4, $5, $6, $7) returning id",
    [randomUUID(), customerId, JSON.stringify(items), details.firstName.trim(), details.lastName.trim(), details.email.trim(), computeTotal(items, 0)],
  );
  return { orderId: rows[0].id };
}
