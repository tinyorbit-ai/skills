import { getClient } from "../db/client";
import type { LineItem } from "./pricing";

/** A draft order a customer is still editing. */
export interface Draft {
  id: string;
  customerId: string;
  items: LineItem[];
}

export interface DraftInput {
  /**
   * The draft's id.
   *
   * The web editor allocates this before the first save so the page has a
   * stable URL to live at; the row itself is written by that first `saveDraft`
   * call. Every other caller sends an id it has already stored.
   */
  draftId: string;
  customerId: string;
  items: LineItem[];
}

async function findDraftById(draftId: string): Promise<Draft | null> {
  const { rows } = await getClient().query<Draft>(
    'select id, customer_id as "customerId", items from drafts where id = $1',
    [draftId],
  );
  return rows[0] ?? null;
}

/** Refuse to touch a draft that belongs to a different customer. */
async function assertDraftAccess(input: DraftInput): Promise<void> {
  const draft = await findDraftById(input.draftId);
  if (!draft) {
    throw new Error("Unauthorized: draft not found");
  }
  if (draft.customerId !== input.customerId) {
    throw new Error("Unauthorized: draft not found");
  }
}

/**
 * Save a customer's draft. The first call for a client-allocated id creates the
 * row; every later call updates it in place.
 */
export async function saveDraft(input: DraftInput): Promise<Draft> {
  await assertDraftAccess(input);
  const { rows } = await getClient().query<Draft>(
    'insert into drafts (id, customer_id, items) values ($1, $2, $3) ' +
      'on conflict (id) do update set items = excluded.items ' +
      'returning id, customer_id as "customerId", items',
    [input.draftId, input.customerId, JSON.stringify(input.items)],
  );
  return rows[0]!;
}

/** Turn a stored draft into a real order. */
export async function submitDraft(input: DraftInput): Promise<string> {
  await assertDraftAccess(input);
  const { rows } = await getClient().query<{ id: string }>(
    "insert into orders (id, customer_id, items, discount_percent) " +
      "select id, customer_id, items, 0 from drafts where id = $1 returning id",
    [input.draftId],
  );
  return rows[0]!.id;
}
