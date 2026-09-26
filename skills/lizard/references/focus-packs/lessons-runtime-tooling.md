# Runtime and Tooling Lessons

Load when the PR changes hot paths, queries over growing data, dependency or runtime versions, build/bundling/CI config, scripts, or tooling.

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

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
