# GraphQL and Client Cache Focus Pack

Load when changed files or PR context mention GraphQL schemas, operations, fragments, resolvers, generated GraphQL types, normalized client caches, pagination, or cache update logic.

Look for:

- Schema/API contract changes that break existing clients, generated types, fragments, persisted operations, or resolver assumptions.
- Pagination changes without stable cursors, end-of-list metadata, total/count semantics, or clear handling for inserted/deleted records between pages.
- Object identity/cache risks: missing stable IDs, inconsistent typenames/entity keys, manual cache writes that drift from normalized data, or stale optimistic updates.
- Authorization differences between list/detail/resolver paths.
- Error/nullability changes that are not reflected in callers or generated contracts.
- Fragment/query changes that fetch too little for the UI/cache to update correctly, or too much from a performance-sensitive path.

Good findings identify the affected client/server contract, describe the stale data or compatibility failure, and suggest the smallest correction: preserve fields, add a new field, update generated contracts, use stable cursors, fix cache identity/update logic, or align null/error semantics.

Reference basis: GraphQL pagination/global object/caching guidance; Apollo Client cache normalization guidance.
