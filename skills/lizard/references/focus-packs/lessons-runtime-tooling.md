# Runtime and Tooling Lessons

Load when the PR changes hot paths, queries over growing data, dependency or runtime versions, build/bundling/CI config, scripts, or tooling.

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

- **A late limit does not bound upstream work.** Signal: growing production reads,
  polling, aggregation, per-row external calls, or helpers that re-read an object their
  caller already holds. Proof: identify the first indexed match, supporting index, stage
  order, result bound, cold-cache fan-out, and how often one operation reads a source.
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
- **A type or variant can pass alone and fail at its registry.** Signal: a factory
  returns a framework generic under hand-written types, a new union arm meets a
  handwritten runtime resolver, or a dependency major moves under an adapter that still
  declares the old one. Proof: push one real result through the registry that consumes
  it (collection type, type resolver, adapter parameter) and read the typecheck output.
- **A declared index or grant is not a deployed one.** Signal: a changed index array, a
  lazy collection factory, setup that only logs a rejected index creation, or a query
  moved to a table under an application-specific role. Proof: follow the owning
  service's deployed predeploy; does one index failure exit nonzero, does the factory
  run first, and does the runtime role hold every grant the changed queries need?
- **A green deploy run does not prove the reviewed build is serving.** Signal: readiness
  read from a workflow's SHA and conclusion, promotion paths that succeed on rollback
  holds or unaffected builds, build wrappers that preload env. Proof: trace each success
  and skip path to the artifact actually served; do its env mode and schema match?
- **An unchanged import can change behaviour across a dependency major.** Signal: a major
  bump that keeps version subpaths, permissive schema fields, sparse records or JSON
  round-trips. Proof: cross absent, explicit undefined, null and populated values through
  the real producers and parse boundary on both versions; which change outcome?
- **A passing test can still pass without the guard it names.** Signal: finite mock
  delays before pending-state checks, typing helpers that rewrite input, fixtures that
  change two guarded fields, reloads standing in for real recovery, build-only CI lanes.
  Proof: with the guard removed or only its field varied, does the test fail, and does
  its lane trigger on every source its assertions read?
- **A wrapper can resolve before the work it wraps has finished.** Signal: `spawn` with
  only a `close` listener, write streams ended but not awaited, error listeners attached
  late, a recorder after a generator's `finally`. Proof: throw mid-stream, fail before
  close and slow the flush; does the caller still see the error, the whole file and the
  record?
- **A checker that re-parses input must agree with the real parser.** Signal: summaries
  over top-level tokens, hand-rolled depth counters, px-only lengths, URL component
  accessors, a raw-body reparse after an authenticated parser. Proof: list every syntax
  family the real parser accepts and compare verdicts; where the checker can't tell,
  does it say unknown?
- **A prompt or agent change reaches journeys it was not written for.** Signal: substring
  or whole-conversation triggers, copy-ready example queries, CTAs seeding a specialised
  prompt into a shared chat, a persisted agent choice. Proof: run each trigger against
  unrelated journeys and each example through the executor's bounds; can every selection
  and restored thread reach the tools the task needs?

## Production DB reads

For every new or materially changed
query over a collection that grows (polling paths, GraphQL resolvers, workers,
dashboards, admin endpoints — internal-only included), the reviewer checks whether
it is bounded and index-supported: repository indexes/migrations, equivalent query
precedent, and available query-plan context. A proven missing leading index or
unbounded path is **major**; the concrete fix is to add the matching index or bound
the path. If support cannot be established either way, ask a non-blocking question —
never tell the author to attach evidence. For Mongo aggregations, check **stage
order**: a `$limit` after `$sort`, `$group`, `$lookup`, or any cardinality-changing
stage does not bound the scan/sort/group work — identify the first indexed `$match`
and its supporting index. External API calls fanning out from a DB result set are an
N+1 even when cached — cold paths and cache misses count.
