feat(orders): add draft orders

## Why

Customers lose work when they navigate away mid-order. Drafts let the web editor
persist what has been entered so far and submit it later.

## What

- Add a `drafts` table and the `saveDraft` / `submitDraft` pair.
- Check draft ownership on every entry point before touching the row.
- Cover ownership, updates, and orphaned ids with focused tests.

## Validation

- `npm test` (not run here, per workspace instructions).
