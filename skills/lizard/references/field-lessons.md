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
- **A fallback can be hidden by its own container.** Signal: `hidden md:*`, headless
  controls returning `null`, shared header atoms, or a layout guard wrapping the mobile
  fallback. Proof: trace rendered visibility through every ancestor at each breakpoint
  and prove one visible, keyboard-reachable control exists in every cell.
- **A visual refactor must preserve zero-result feedback.** Signal: `return null`
  replacing translated copy, deleted empty-state imports, or broad layout diffs over
  lists. Proof: compare populated, initial-empty, and filter-empty branches against the
  base; every accepted zero state keeps a visible explanation.
- **A deprecated slot can still have live callers.** Signal: a shared layout stops
  rendering a prop while callers keep passing it. Proof: inventory every consumer,
  classify each path as a route change or an in-page state transition, and prove a
  visible control survives on desktop, mobile, and a direct deep link.
- **Hidden from sight is not hidden from the tab order.** Signal: mounted fade wrappers,
  `opacity-0`, or `pointer-events-none` around buttons and links. Proof: test tab order
  and accessibility-tree state in both states; unmount or apply a complete inert
  semantic state while hidden.
- **Error states must compose, not accumulate.** Signal: one form holds several error
  flags or an enum, with early-return validation before the previous result is cleared.
  Proof: transition across failure, edit, invalid retry, valid retry, and success; every
  visible message must describe the latest attempted action.
- **URL state changes the list without calling your handler.** Signal: `useSearchParams`
  or a URL-backed list hook beside local selection and cursor state, especially with
  debounced commits. Proof: exercise direct links, reload, back/forward, and selection
  during debounce; every committed query-signature change must invalidate cursor and
  selection.
- **A deep link must pass the destination's own entry policy.** Signal: query parameters
  that call a shared selection setter, cached provider state, async list resolution, or
  a destination with `shouldShow*` predicates. Proof: run the source-action, permission,
  provider-state, and history/manual-choice cells with real providers; stale selections
  clear before render and manual intent cancels a pending link.
- **A guard that deregisters itself may never come back.** Signal: a handler calls `off`
  from its clean branch, or a form library mutates dirty state in place without changing
  the effect dependency. Proof: run clean navigation, then a later edit, then
  cancel/continue; one listener must stay registered until unmount and read current
  state.
- **Displayed identity and gating policy must read the same object.** Signal:
  `modified* ?? original*` display logic beside guards that still read the original, in
  amendment, substitution, or optimistic-update flows. Proof: run original-true with
  replacement-false and the inverse; every policy-bearing element reads the effective
  object.

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
- **Every generated artifact must be regenerated from its own source.** Signal: a
  schema change with several checked-in generated outputs, especially after the PR
  evolved through more than one API shape. Proof: enumerate every codegen target,
  compare each generated symbol family to its configured source, and read the generation
  gate's changed-file output.
- **A type can compile alone and fail at its registry.** Signal: an exported factory
  returns a framework generic with hand-written request types while callers collect
  results under the default generic. Proof: assign one representative result to the real
  registry element type or read the current typecheck output; every generic member must
  stay contravariantly compatible.
- **A declared index is not a created index.** Signal: a changed raw-driver index array,
  a lazy collection factory, cross-service collection ownership, or a predeploy that
  only runs ORM `ensureIndexes`. Proof: follow the owning service's deployed predeploy
  command, prove the factory runs before index creation, and rule out any other path
  creating the same named index.

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
- **Validation after a durable write is not a guard.** Signal: a new `assert`, `throw`,
  or typed input error appears after an RPC, status transition, create, enqueue, or
  email-preparation step. Proof: place validation before the first durable side effect,
  then test that the rejected input leaves every writer untouched and stays retryable.
- **Delete-only reconciliation ignores rows that changed.** Signal: bounded incremental
  reads with a delete-only post-hook over mutable keys or derived totals. Proof: compare
  the full-refresh predicate and projected tuple to every reconciliation condition, then
  exercise identity changes, value changes, and partial reversals on rows that stay
  eligible.
- **A rollback needs per-record identity, not a parent marker.** Signal: a backfill
  updates selected array elements and stamps only the parent. Proof: record collection,
  parent id, child id, and written value before mutating; roll back only that child, and
  only while its current value still matches the repair.
- **An incremental window must handle newly eligible old rows.** Signal: bounded
  candidate windows, last-touch or best-of-many ranking, stored-candidate unions, and a
  slower full-refresh backstop. Proof: enumerate unknown-to-stored transitions for every
  excluded candidate class and compare both omission and substitution outcomes against a
  full refresh.
- **An unbounded external call outlives its lock.** Signal: an awaited third-party call
  while a durable lock is held, no `AbortSignal` or client deadline, and stale-lock
  reacquisition. Proof: bound every external wait below the stale threshold, map the
  timeout safely, and prove no side effect runs after lock ownership is lost.

## Review mechanics

- **The diff's entry point is only one cell.** Signal: shared bootstraps, lifecycle
  hooks, workflow prerequisites, cross-package constants, or multi-caller guards.
  Proof: enumerate every entry point by lifecycle and record every materially different
  cell in the receipt.
- **A new ambient dependency invalidates every unchanged mount site.** Signal: the diff
  adds a context hook, DI lookup, or required-ancestor call to a component or service
  the diff does not mount — sharpest when the same unit is mounted from more than one
  root (legacy + new router, app shell + test harness, web + native). Proof: list every
  mount site, changed or not, and walk each one's ancestor chain for every newly
  required provider; the site absent from the diff is the likeliest to be wrong,
  because nothing in the review surfaces it. Confirming the mount exists is not
  confirming it is nested correctly. A unit documented as non-blocking still takes down
  its host when the dependency throws during render, outside its own try/catch.
- **A requested fix is new code, not proof of resolution.** Signal: the review asks for
  fail-closed behavior, contains an unresolved "if", or reshapes tests around a guard.
  Proof: enumerate legitimate producers before prescribing, then run the inverse test:
  what does this fix reject that worked before?
- **Posting requires fresh repository state.** Signal: any review long enough for a
  push, restack, close, or merge. Proof: immediately before submission re-fetch both
  PR state and head SHA; stop when closed/merged and restart dedup on a moved head.
- **A re-review re-reads the issue, not just the diff.** Signal: the linked issue
  changes between rounds, author replies supersede earlier requirements, or a re-review
  is forced without equivalent code changes. Proof: rebuild the full issue-fit matrix
  for every user-facing entry point on the current head, including unchanged PR code,
  before resolving prior scope findings.
