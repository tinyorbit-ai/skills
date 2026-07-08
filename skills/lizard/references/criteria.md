# Review Criteria

The seven groups behind every verdict. All seven apply at every tier; the tier only
changes how much machinery digs into them. The receipts block records each group with
a pass/fail (e.g. `performance (n+1 ✓, complexity ✓)`).

Apply findings with evidence: cite file:line from the diff, for convention claims cite
an in-repo precedent, and for behavioral claims cite the code you traced. Do not invent
issues — a clean PR gets a clean stamp. Two counterweights (SKILL.md): on high-risk
surfaces **absence of proof is itself a finding**, and on the finding side **not proven
broken is not broken** — a correctness claim you can't ground in code you read drops to
a hedged question, never a major.

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
dashboards, admin endpoints — internal-only included), prove it is bounded and
index-supported. Acceptable proof: a repo-declared index or migration, a cited
equivalent query with precedent, or an explain/query-plan claim in the PR body. No
proof = **major** — "live indexes may exist outside the repo" is residual
uncertainty, not clearance. For Mongo aggregations, check **stage order**: a
`$limit` after `$sort`, `$group`, `$lookup`, or any cardinality-changing stage does
not bound the scan/sort/group work — identify the first indexed `$match` and its
supporting index. External API calls fanning out from a DB result set are an N+1
even when cached — cold paths and cache misses count.

Severity guide: an N+1/quadratic on a path fed by user-scale data is **major**; on a
bounded admin path with a handful of items it is a **minor** with the fix inline.
Access restriction never downgrades: a superuser-only dashboard polling production
data melts the same database.

## 2. Economy of means

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
- Failing CI is read as review signal — which test, what does it say about the diff —
  never re-run locally, never a reason by itself to withhold the stamp.
