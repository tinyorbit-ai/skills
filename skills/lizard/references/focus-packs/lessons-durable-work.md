# Durable Work Lessons

Load when the PR changes jobs, retries, idempotency, workflows, billing/credits/usage counting, ledgers, or anything that must happen exactly once.

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

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
