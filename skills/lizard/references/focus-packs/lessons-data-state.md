# Data and State Lessons

Load when the PR changes persisted state, schemas or parsers at a boundary, caches, hydration, serialization, ids, filters, defaults, backfills, or shared constants.

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

- **Degraded data must not enter the success cache.** Signal: optional reads fall back
  to empty/null and flow into a normal result builder. Proof: track completeness
  separately; skip the success cache or use a short retry policy, then prove the next
  request retries.
- **Audit identity cannot come from untrusted input.** Signal: model/API payloads carry
  actor, owner, creator, or updater fields. Proof: derive attribution from authenticated
  context at the write boundary and attempt spoofing in a test.
- **New ingestion paths can duplicate existing coverage.** Signal: a registry, source,
  endpoint, or backfill is added. Proof: build a source-to-sink coverage map, verify the
  endpoint contract exists, and rule out duplicate raw/enriched ingestion.
- **Correlated optional fields form one contract.** Signal: mode plus payload, parent
  plus child id, or a fallback that changes behavior. Proof: validate combinations and
  authoritative child ownership at every write boundary; compare accepted input,
  stored state, confirmation copy, and runtime behavior.
- **Accepted precision must survive storage.** Signal: provider timestamps exceed the
  adapter or database precision. Proof: preserve a source-precision ordering value or
  add a deterministic tie-breaker; test two valid values inside one storage quantum.
- **A passed option can be inert.** Signal: a new flag crosses layers while tests call
  a nearby helper directly. Proof: trace the value from the real entry point to the
  consuming branch or sink and test that exact chain.
- **An invariant must survive every writer.** Signal: scope, owner, tenant, permission,
  or status is stored in mutable state, or a consumer assumes a field that only a later
  transition writes. Proof: inventory writes, resets, hydration, copies, serialization,
  retries, and mode switches; build a status-by-writer matrix from creation through
  every transition and test each accepted state before removing a fallback.
- **Parallel implementations need cell-for-cell parity.** Signal: legacy/new routers,
  v1/v2 endpoints, or client/server siblings. Proof: compare present, null, empty,
  error, permission, query, and fragment inputs on both sides.
- **A proxy discriminator can collide.** Signal: behavior gates on location, channel,
  role, mode, or a layout boolean. Proof: list every caller's real predicate tuple,
  including non-target callers with the same values; use an explicit intent signal
  when identical tuples need different behavior.
- **A display name is not an identity.** Signal: a producer emits user- or
  config-defined copy while a downstream guard matches a fixed string. Proof: inventory
  producers and serializers, identify a stable type/code/ID, and trace every consumer
  before and after persistence.
- **Locale must survive every hop.** Signal: `useLocale` reaches query variables only,
  or one screen switches between several documents by route param, booking ID, or
  legacy identifier. Proof: build the route-by-query matrix so every document passes the
  active locale to every localized field, then trace that locale into every formatter;
  exercise a non-English month on the rendered route.
- **Adding names does not make a scope-keyed upsert safe.** Signal: an existing upsert
  matches on restriction or config fields while the PR adds names, lists, or
  multiple-record semantics. Proof: enumerate create-same-scope, edit-by-ID, retry,
  reversed-order, and delete/recreate identities; prove no create silently mutates
  another named record.
- **A single-object read cannot feed a best-of-many selector.** Signal: backend
  selection uses all matches or a maximum while a resolver or DataLoader returns one
  record. Proof: build a producer-to-consumer matrix over zero, one, same-scope, and
  partially overlapping matches; every surface must receive the same candidate set and
  selector.
- **A repair must satisfy the caller's next comparison.** Signal: a fix reconstructs a
  field on a child, fallback, or replacement while its source stays unchanged and the
  caller compares both. Proof: trace the returned object through every immediate caller
  branch and cover the full operation plus retry, not the helper alone.
- **A read type must match the oldest stored row.** Signal: a schema without timestamps
  or with defaults moves behind a raw driver whose public type requires those values.
  Proof: compare stored legacy shapes with both read and write types, make absent fields
  optional until backfill, and exercise one legacy row at the consumer boundary.
- **Paired current/retained state needs every writer to honour it.** Signal: fields like
  `status` plus `statusBeforeArchive`, with in-flight work or background jobs keyed only
  by ID. Proof: build the full writer set active after the transition; each must keep
  the outer state and update the retained inner one; exercise archive, background
  completion, then restore.
- **Partitioning can strip context the callee still needs.** Signal: a PR splits line
  items or records before calling an unchanged helper that derives policy from sibling
  rows. Proof: separate context rows from rows sent to the side effect, run the real
  helper over every partition class, and prove context-only data cannot leak into the
  destination.
