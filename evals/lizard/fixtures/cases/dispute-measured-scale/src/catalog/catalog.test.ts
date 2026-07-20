import { describe, expect, it } from "vitest";
import { configureClient, type DbClient } from "../db/client";
import { findProductsByIds, PRODUCT_SEARCH_LIMIT, searchProducts } from "./catalog";

function stubClient(rows: unknown[]): DbClient {
  return {
    async query<Row>(): Promise<{ rows: Row[] }> {
      return { rows: rows as Row[] };
    },
  };
}

/** A statement the recording client was asked to run, with its parameters. */
interface RecordedCall {
  sql: string;
  params: unknown[];
}

/** A stub that records every statement and parameter list it is handed. */
function recordingClient(rows: unknown[]) {
  const calls: RecordedCall[] = [];
  const client: DbClient = {
    async query<Row>(sql: string, params: unknown[] = []): Promise<{ rows: Row[] }> {
      calls.push({ sql, params });
      return { rows: rows as Row[] };
    },
  };
  return { client, calls };
}

/** Assert exactly one statement ran, and hand it back for inspection. */
function onlyCall(calls: RecordedCall[]): RecordedCall {
  const [call] = calls;
  if (calls.length !== 1 || call === undefined) {
    throw new Error(`expected exactly one query, saw ${calls.length}`);
  }
  return call;
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

describe("searchProducts", () => {
  it("escapes wildcards so a typed % matches literally", async () => {
    const { client, calls } = recordingClient([]);
    configureClient(client);
    await searchProducts("50%_off");
    expect(onlyCall(calls).params).toEqual(["50\\%\\_off"]);
  });

  it("caps the row count inside the query, not at the call site", async () => {
    const { client, calls } = recordingClient([]);
    configureClient(client);
    await searchProducts("widget");
    expect(onlyCall(calls).sql).toContain(`limit ${PRODUCT_SEARCH_LIMIT}`);
  });

  it("computes no total count — one statement per search", async () => {
    const { client, calls } = recordingClient([]);
    configureClient(client);
    await searchProducts("widget");
    expect(onlyCall(calls).sql).not.toContain("count(");
  });

  it("matches nothing and issues no query for a blank term", async () => {
    const { client, calls } = recordingClient([
      { id: "p1", name: "Widget", priceCents: 500, active: true },
    ]);
    configureClient(client);
    expect(await searchProducts("   ")).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
