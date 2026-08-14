import { describe, expect, it } from "vitest";
import { configureClient, type DbClient } from "../db/client";
import { saveDraft, submitDraft, type Draft } from "./drafts";

function stubClient(rowsByCall: unknown[][]): DbClient {
  let call = 0;
  return {
    async query<Row>(): Promise<{ rows: Row[] }> {
      const rows = (rowsByCall[call] ?? []) as Row[];
      call += 1;
      return { rows };
    },
  };
}

const stored: Draft = { id: "draft-1", customerId: "cust-1", items: [] };

describe("saveDraft", () => {
  it("creates the row on a client-allocated id's first save", async () => {
    configureClient(stubClient([[], [stored]]));
    await expect(
      saveDraft({ draftId: "draft-1", customerId: "cust-1", items: [] }),
    ).resolves.toEqual(stored);
  });

  it("updates a draft the customer already owns", async () => {
    configureClient(stubClient([[stored], [stored]]));
    await expect(
      saveDraft({ draftId: "draft-1", customerId: "cust-1", items: [] }),
    ).resolves.toEqual(stored);
  });

  it("refuses a draft owned by someone else", async () => {
    configureClient(stubClient([[{ ...stored, customerId: "cust-2" }]]));
    await expect(
      saveDraft({ draftId: "draft-1", customerId: "cust-1", items: [] }),
    ).rejects.toThrow("Unauthorized");
  });
});

describe("submitDraft", () => {
  it("submits a draft the customer owns", async () => {
    configureClient(stubClient([[stored], [{ id: "order-1" }]]));
    await expect(
      submitDraft({ draftId: "draft-1", customerId: "cust-1", items: [] }),
    ).resolves.toBe("order-1");
  });
});
