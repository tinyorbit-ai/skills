import { beforeEach, describe, expect, it } from "vitest";
import { configureClient, type DbClient } from "../db/client";
import { listOrdersWithProducts } from "./orders";

/** A stub client that answers each query from the first handler that matches its SQL. */
function stubClient(handlers: Array<(sql: string) => unknown[] | null>): DbClient {
  return {
    async query<Row>(sql: string): Promise<{ rows: Row[] }> {
      for (const handler of handlers) {
        const rows = handler(sql);
        if (rows !== null) return { rows: rows as Row[] };
      }
      return { rows: [] };
    },
  };
}

describe("listOrdersWithProducts", () => {
  beforeEach(() => {
    configureClient(
      stubClient([
        (sql) =>
          sql.includes("from orders")
            ? [
                {
                  id: "o1",
                  customerId: "c1",
                  items: [{ productId: "p1", unitPriceCents: 500, quantity: 2 }],
                  discountPercent: 10,
                },
              ]
            : null,
        (sql) =>
          sql.includes("from products")
            ? [{ id: "p1", name: "Widget", priceCents: 500, active: true }]
            : null,
      ]),
    );
  });

  it("resolves products and computes the discounted total", async () => {
    const [row] = await listOrdersWithProducts("c1");
    expect(row?.totalCents).toBe(900);
    expect(row?.products).toEqual([{ id: "p1", name: "Widget", priceCents: 500, active: true }]);
  });
});
