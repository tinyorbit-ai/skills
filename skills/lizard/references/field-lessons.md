# Field Lessons

Durable failure patterns learned from completed reviews. Scan every row on T2 and T3.
These are proof prompts, not presumed findings: trace the current PR before raising
anything.

## Product and interface outcomes

- **Composable surfaces can form dead ends.** Signal: optional block unions or a
  pre-flow builder where only one block owns the next action. Proof: enumerate
  zero/one/mixed configurations and show every accepted surface has a live route to
  the promised outcome or a safe fallback.
- **An unblock can discard the required outcome.** Signal: required fields filtered,
  weakened, or made optional. Proof: each required value remains visible, accepted,
  submitted, and persisted; advancing the flow alone proves nothing.
- **Queued UI work can capture stale render state.** Signal: delayed callbacks read
  async query data or snapshots. Proof: invoke before and after data arrival and
  assert the final rendered and persisted result, including production scheduling
  semantics when they differ.
- **Interaction claims need an interaction chain.** Signal: copy promises change,
  edit, choose, or picker behavior. Proof: map the claim through an accessible control,
  state mutation, outbound payload, execution input, and focused test.
- **Scope expansion invalidates settled documentation.** Signal: one variant becomes
  many while changed docs retain narrow words such as "only". Proof: re-check every
  modified claim against the final type-by-entry-point matrix.
- **Text matches do not identify the requested journey.** Signal: sibling templates
  or flows share the same copy. Proof: map the source request to its exact runtime
  type, producer, configured inputs, and template before judging the changed cohort.
- **A marker is not a visible outcome.** Signal: history is revealed, ascending sort,
  current/selected highlighting, or a bounded viewport. Proof: overflow the surface
  and show the current item is initially visible or programmatically reached.

## Data and state boundaries

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
  or status is stored in mutable state. Proof: inventory writes, resets, hydration,
  copies, serialization, retries, and mode switches; assert at the final consumer.
- **Parallel implementations need cell-for-cell parity.** Signal: legacy/new routers,
  v1/v2 endpoints, or client/server siblings. Proof: compare present, null, empty,
  error, permission, query, and fragment inputs on both sides.
- **A proxy discriminator can collide.** Signal: behavior gates on location, channel,
  role, mode, or a layout boolean. Proof: list every caller's real predicate tuple,
  including non-target callers with the same values; use an explicit intent signal
  when identical tuples need different behavior.

## Performance, runtime, and tooling

- **A late limit does not bound upstream work.** Signal: growing production reads,
  polling, aggregation, or per-row external calls. Proof: identify the first indexed
  match, supporting index, stage order, result bound, and cold-cache fan-out.
- **Deployment configuration has platform limits.** Signal: serverless env vars,
  certificates, keys, package changes, or native dependencies. Proof: check the target
  runtime's env and artifact limits; precedent from another runtime is not evidence.
- **Cached initialization failures can poison warm runtimes.** Signal: module-scope
  clients or connection promises. Proof: show rejection clears the cache or cannot
  persist across invocations; if an adversary is unavailable, run a real independent
  refutation instead of recording a receipt only.
- **Tool tests must reproduce the real execution boundary.** Signal: workflow scripts
  copied to temporary directories, bare imports, analyzers, or codemods. Proof: run
  the exact CI command from its real location and replay every in-repo syntax family.
- **Vendor limits must cover the requested window.** Signal: history functions,
  pagination/result-limit arguments, or high-frequency jobs over long windows. Proof:
  calculate maximum cardinality and verify current vendor limits; split the window or
  use an uncapped source when needed.
- **Hashes require deterministic representations.** Signal: object or JSON text is
  hashed for parity. Proof: use an ordered scalar representation or direct null-safe
  comparisons; never assume unordered serialization is stable.

## Durable work and accounting

- **Retry counters need a terminal policy.** Signal: attempt counts, bounded sweeps,
  leases, or deterministic external refusal. Proof: enforce a ceiling or name an
  explicit infinite-retry policy, expose a terminal/dead-letter state, prevent batch
  starvation, and define how later writes recover or supersede.
- **Rounded parts must conserve the total.** Signal: money/tax totals and recipient
  splits round independently. Proof: assert the total equals the exact sum of rounded
  parts and name where any residual goes; compare before/after warning counts.
- **Persistence is not completion for idempotency.** Signal: a dedup record is written
  before enqueue or another downstream handoff. Proof: distinguish completed from
  recoverable failure and inject a handoff failure followed by same-key redelivery.
- **Recovery must not redo successful work.** Signal: retries operate over all accepted
  rows instead of the failed subset. Proof: normal replay skips regeneration, failed
  replay touches only affected items, and per-item state matches committed work.
- **Queue state transitions must be monotonic.** Signal: multi-stage at-least-once
  pipelines update one durable row. Proof: inject late duplicates at every boundary;
  no upstream delivery may move executing or complete work back to a claimable state.

## Review mechanics

- **The diff's entry point is only one cell.** Signal: shared bootstraps, lifecycle
  hooks, workflow prerequisites, cross-package constants, or multi-caller guards.
  Proof: enumerate every entry point by lifecycle and record every materially different
  cell in the receipt.
- **A requested fix is new code, not proof of resolution.** Signal: the review asks for
  fail-closed behavior, contains an unresolved "if", or reshapes tests around a guard.
  Proof: enumerate legitimate producers before prescribing, then run the inverse test:
  what does this fix reject that worked before?
- **Posting requires fresh repository state.** Signal: any review long enough for a
  push, restack, close, or merge. Proof: immediately before submission re-fetch both
  PR state and head SHA; stop when closed/merged and restart dedup on a moved head.
