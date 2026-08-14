# Review Criteria

The seven groups behind every verdict. All seven apply at every tier; the tier only
changes how much machinery digs into them. The receipts block records each group with
a pass/fail (e.g. `performance (n+1 ✓, complexity ✓)`).

Apply `scope.md` before severity. Cite file:line from the diff, an in-repo precedent
for convention claims, and the code traced for behavior. Do not invent issues — a
clean PR gets a clean stamp. Evidence gathering belongs to the reviewer. A claim you
cannot ground drops to a hedged question, never a major or an author evidence chore.

## 1. Performance

- **N+1 queries** — any DB/API call inside a loop or per-item resolver. 500 items
  must not mean 501 queries. Demand batching: `$in`, a join, a dataloader, one
  prefetch before the loop.
- **Quadratic and worse** — nested scans over the same collection; `.includes()`,
  `.find()`, or `.indexOf()` inside a loop over the same data (build a Set/Map first);
  sorting or regex-compiling inside an iteration.
- **Unbounded queries** — reads with no limit/pagination on collections that grow;
  fetching full documents for one field; full-table scans for a count.
- **Missing indexes** — a new query shape (new filter/sort combination) on a large
  collection with no supporting index. Check the schema/index definitions near the
  changed query.
- **Wasted concurrency** — sequential `await`s over independent operations that
  should run in parallel; hot-path allocations inside tight loops.

**Proof obligation — production DB reads.** For every new or materially changed
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

Severity guide: an N+1/quadratic on a path fed by user-scale data is **major**; on a
bounded admin path with a handful of items it is a **minor** with the fix inline.
Access restriction never downgrades: a superuser-only dashboard polling production
data melts the same database.

## 2. Economy of means

This is a hard synthesis gate, not a taste note. New parts are default-denied; apply
the subtraction order and scope-ratchet circuit breaker in `scope.md` before any
finding survives.

- **Least means to the stated outcome** — could this diff be meaningfully smaller and
  still do the whole job? Propose the subtraction inline, like any other finding.
- **New abstractions, layers, and dependencies must pay rent** — the repo carries
  them forever. A new dependency for something ten lines of code can do is a finding.
- **Search before building** — if an existing in-repo util, helper, or pattern
  already does what the PR reimplements, that is a finding; name the existing one.
- **Absorbed complexity counts** — simple ≠ minimal. Hiding complexity inside a magic
  dependency or a clever abstraction is not economy; judge the total the repo absorbs.

Severity guide: usually **minor** (inline, non-blocking); **major** only when the
repo inherits real carrying cost — a heavy new dependency, a parallel implementation
of an existing subsystem, an abstraction that will force future contortions.

## 3. Correctness & edge cases

- Logic errors, off-by-one, race conditions, ordering bugs, stale state.
- Missing null / empty / duplicate / permission / concurrency / retry / timeout /
  partial-failure handling. Input validation and output shape at system boundaries.
- **Runtime input contracts across boundaries** — for every new or repurposed
  action, RPC, client, or shared-helper call, read the callee's actual parser/schema
  and compare the values the caller sends. TypeScript primitives do not encode Zod
  refinements; one platform's limit or enum is not proof another boundary accepts it.
- **Backwards compatibility** — callers, persisted data, API consumers, user
  workflows. Grep call sites; do not assume.
- **Behaviour preservation in refactors and migrations** — the #1 risk is silent
  semantic drift: default values, timestamps, validation, serialization, return-doc
  semantics (e.g. findOneAndUpdate old-vs-new), upsert flags, projection and sort.
- **Removed or renamed exports** — every call site found and updated. A missed one is
  critical.
- **Assertions of broken behavior must be grounded, not inferred.** A correctness
  finding is only as strong as the evidence under it — trace the real behavior (read
  the helper, follow the value, check the default) instead of inferring it from a name
  or a plausible story. Ungrounded, it's a question, not a major.

**Proof obligation — reachability.** A unit is only reviewed once every way of
reaching it is. Before judging a change to anything more than one caller or lifecycle
reaches, enumerate the grid and judge the change in **every** cell:

- **entry points** — channels, callers, triggers, dispatch modes, routes, queue
  consumers, sibling handlers sharing a bootstrap, every consumer of a shared
  constant or schema.
- **lifecycles** — first call vs. subsequent, cold vs. warm, create vs. update,
  mount / remount / reload / navigate-away, empty vs. populated state.

Trigger signals: a new guard, assert, early return, or `throw` on a missing or
unexpected value; shared bootstrap or module-scope init; a hook or effect owning state
across routes; a job added to a workflow's `needs`; a constant crossing a package
boundary; a producer whose consumer mounts under a different gate; any id minted by a
client before the server has stored it.

An unenumerated cell is unreviewed, not safe — the happy-path cell is never the one
that breaks. Record the grid in the receipts, naming the cell that motivated the
change and at least one cell that is not the happy path; "callers checked ✓" is not a
receipt. Finding one bug in a grid and stopping is what turns one review into four.

## 4. Security & safety

- Injection — SQL/NoSQL, command, path traversal, and prompt injection where LLM
  surfaces are touched. Unsafe deserialization.
- AuthN/AuthZ on every new endpoint, resolver, and queue consumer; tenant and
  permission boundaries preserved.
- Secrets in code, config, or fixtures. **PII in logs.**
- Data deletion and migration blast radius — what happens to existing rows, and can
  it be rolled back?

Security regressions are **critical**.

## 5. Issue fit & claims

- Does the diff solve the **stated** issue — not a nearby one, not a subset silently.
- The latest linked issue criteria are authoritative. Removed criteria may inform a
  follow-up but cannot remain blockers.
- **Every claim in the PR body is verified** against gathered context
  (`references/context.md`): acceptance criteria in the linked Linear issue become
  individually checkable items; "per the spec" means the spec was read and compared.
- Unverifiable issue fit on a non-trivial PR is itself **major** — the missing PR
  body is not the finding; the inability to know why the change exists is.
- Stack-aware: judge whether this PR is a coherent step and name what is deferred.

## 6. Repo bar & conventions

- The code meets the **average standard of the codebase it lands in** — inferred from
  the files it touches and their neighbors. Not an ideal, not a style crusade.
- Naming, function decomposition, dead code, wrong-fit abstractions, accidental
  module hubs.
- **Cited precedent required** — any "this repo does X" claim points at an existing
  file that does X.
- Local guidance near the changed files (CLAUDE.md, AGENTS.md, package docs, test
  conventions) wins over generic taste. Read it from the base branch.

## 7. Tests

- New behaviour has tests; edge cases covered, not only the happy path.
- **Weakened, skipped, or deleted tests** are examined, not skimmed — a removed test
  that hid a regression is **critical**.
- Test quality counts against the repo bar: assertions that can't fail, mocks that
  mock the thing under test.
- A mocked action/RPC/client proves caller behavior, not boundary compatibility.
  When behavior depends on a schema, range, or enum, require a test through the real
  parser at the intended value and its nearest rejected boundary.
- Failing CI is read as review signal — which test, what does it say about the diff —
  never re-run locally, never a reason by itself to withhold the stamp.
