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
- **Absence and correlated optionals must mean one thing everywhere.** Signal: null,
  empty, zero, `UNSPECIFIED` or a missing match drives a decision; key presence is taken
  as proof; mode plus payload or parent plus child id are separate optionals. Proof:
  cross absent, empty, zero, unknown, skipped and not-loaded values and every
  mode-by-child pair through each consumer; does any reach the real-value branch?
- **Accepted precision must survive storage.** Signal: provider timestamps exceed the
  adapter or database precision. Proof: preserve a source-precision ordering value or
  add a deterministic tie-breaker; test two valid values inside one storage quantum.
- **A passed option can be inert.** Signal: a new flag crosses layers while tests call
  a nearby helper directly. Proof: trace the value from the real entry point to the
  consuming branch or sink and test that exact chain.
- **An invariant must survive every writer.** Signal: scope, owner, tenant, permission or
  status in mutable state, often a current/retained pair (`statusBeforeArchive`), or a
  consumer assuming a field only a later transition writes. Proof: inventory writes,
  resets, hydration, copies, retries and background jobs keyed only by ID; build a
  status-by-writer matrix through archive, late completion and restore.
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
- **Omitted, defaulted and legacy shapes must round-trip unchanged.** Signal: a read type
  stricter than the oldest stored row, an additive field mapped `?? []`, a merge writing
  `undefined` over a default, an upsert whose filter seeds the insert. Proof: replay a
  legacy row and an older client's write that omits the field, then repeat an unchanged
  write; does prior intent survive and does the second pass write nothing?
- **Partitioning can strip context the callee still needs.** Signal: a PR splits line
  items or records before calling an unchanged helper that derives policy from sibling
  rows. Proof: separate context rows from rows sent to the side effect, run the real
  helper over every partition class, and prove context-only data cannot leak into the
  destination.
- **Every consumer must apply the producer's equivalence.** Signal: case-folding,
  trimming, aliasing or a canonical-key change on one side while another stores raw
  values, indexes an exact map, or holds keys an older writer persisted. Proof: carry
  case and space variants, aliases and every legacy stored shape through validation,
  storage and each exact lookup; does every hop reach the same record?
- **Every copy of a value must converge on the newest source.** Signal: a mirror,
  denormalized timestamp, client cache or cached absence has more than one writer; a
  compare-and-set drops its conflict; an insert replaced a refresh that purged. Proof:
  inventory every writer and in-flight read of each copy, interleave pairs in both
  orders, then read after the newest source change; does any copy stay stale?
- **A key, group or batch decision must match its effect's grain.** Signal: a map, dedup
  lookup, `every`/`any` predicate or grouping keyed per recipient, parent or name while
  the effect is per message, line, document or child; a last-wins `Map.set`. Proof: name
  the effect's grain, then feed two members of one key that differ, in both orders; does
  each effect keep its own decision, result and owner?
- **A date needs one shape and zone, and a captured future date can expire.** Signal:
  `YYYY-MM-DD` beside zoneless datetimes; a picker `Date` sent through `toISOString()`; a
  date-only vendor filter; a queued message or next-charge field carrying a date. Proof:
  run each producer shape through storage, vendor and display at positive, zero and
  negative offsets, then pass the date before use; is the claim still true when sent?
- **Normalized output must fit every receiver's limits.** Signal: a producer widens a
  snapshot or batch, a parser changes canonical text, or a size check runs before the
  envelope is added. Proof: test the final payload at max-1, max and max+1 against each
  real receiver's length, count, byte and syntax limits.
