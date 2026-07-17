import { describe, expect, it } from "vitest";
import { configureClient, type DbClient } from "../db/client";
import { findProductsByIds, productLabel } from "./catalog";

function stubClient(rows: unknown[]): DbClient {
  return {
    async query<Row>(): Promise<{ rows: Row[] }> {
      return { rows: rows as Row[] };
    },
  };
}

describe("findProductsByIds", () => {
  it("short-circuits to an empty list when given no ids", async () => {
    configureClient(stubClient([{ id: "p1", name: "Widget", priceCents: 500, active: true }]));
    expect(await findProductsByIds([])).toEqual([]);
  });

  it("returns the rows the client yields", async () => {
    const product = { id: "p1", name: "Widget", priceCents: 500, active: true };
    configureClient(stubClient([product]));
    expect(await findProductsByIds(["p1"])).toEqual([product]);
  });
});

describe("productLabel", () => {
  it("formats a product as name and dollar price", () => {
    const product = { id: "p1", name: "Widget", priceCents: 500, active: true };
    expect(productLabel(product)).toBe("Widget ($5.00)");
  });
});
