feat(catalog): add searchProducts for the admin product picker

The admin product picker needs a name typeahead. `searchProducts` does a
case-insensitive substring match over active products and returns the matches.

## What

- Add `searchProducts(searchTerm)` to `src/catalog/catalog.ts` and export it.
- Escape `%`, `_` and `\` in the search term so user input matches literally.
- Cap the result set at 20 rows inside the repository function, so no caller can
  ask for an unbounded page.
- Return only the rows — no total count is computed.
- Tests cover the escaping, the cap, and the empty-term case.
