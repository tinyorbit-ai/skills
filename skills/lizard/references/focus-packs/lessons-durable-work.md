# Durable Work Lessons

Load when the PR changes jobs, retries, idempotency, workflows, usage counting, or anything that must happen exactly once.

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

- **Retry counters need a terminal policy.** Signal: attempt counts, bounded sweeps,
  leases, or deterministic external refusal. Proof: enforce a ceiling or name an
  explicit infinite-retry policy, expose a terminal/dead-letter state, prevent batch
  starvation, and define how later writes recover or supersede.
- **Persistence is not completion for idempotency.** Signal: a dedup record is written
  before enqueue or another downstream handoff. Proof: distinguish completed from
  recoverable failure and inject a handoff failure followed by same-key redelivery.
- **Recovery must finish exactly the unfinished work.** Signal: "already applied, skip"
  guards; no-op comparators gating a downstream sync; a phase stamp, existing row or
  shared marker written by a different step or sink; retries over all accepted rows or
  a payload missing a transient ID. Proof: inject a failure after each step, then retry
  through the real entry point; does every remaining side effect finish once, finished
  work stay untouched, and each skip rest on that step's own acknowledgment?
- **A stable request key must map to a stable result.** Signal: server-side ID
  allocation per attempt; a key minted per render or error page; a count-capped dedup
  list; a create that returns a prior equivalent row without storing the new key.
  Proof: commit, lose the response, then retry the same key after rotation, eviction or
  reuse; does every accepted key return the same object, or a conflict, with one side
  effect?
- **Writes that must land together need a commit or a visible partial state.** Signal:
  sequential appends or reservations with no group marker or receipt; a parent before a
  required child in separate writes; a legacy split write routed into a new path; an
  alert or outbox row emitted inside a transaction that can roll back. Proof: interrupt
  at every write boundary and follow the surviving state through recovery; can each
  reader tell it apart from complete and from never-started?
- **Queue state transitions must be monotonic.** Signal: multi-stage at-least-once
  pipelines update one durable row. Proof: inject late duplicates at every boundary;
  no upstream delivery may move executing or complete work back to a claimable state.
- **A check does not fence the write that follows it.** Signal: a status, version or
  permission read, an await, then a write filtered only by ID or a whole-snapshot `$set`;
  a claim that leaves the row eligible or ignores its result; a timestamp or plan fixed
  before a retrying transaction, prompt or dry-run. Proof: pause after the last read,
  commit every other writer of that record, release; does the write's own filter reject
  the stale read, and does each no-match say which writer won?
- **"Not written yet" is not "absent".** Signal: a guard, count, sweep or cleanup finds
  no row, no version or an empty mirror, then acknowledges, prunes, advances a cursor or
  takes an unfenced first-write path, while the row comes from a later event, an
  uncommitted child or a projection. Proof: hold each writer of that row before commit,
  run the reader, release; is the late row still seen, or did the reader make its
  absence permanent?
- **A catch must not turn a refusal or outage into absent, empty or done.** Signal:
  `catch` returning `undefined`/`[]`/null or a held result; `data ?? []` without its
  error; a best-effort writer whose field later gates money or capacity; a failure
  counted but missing from the alarm selector. Proof: cross success, success-empty,
  domain refusal and dependency outage through the real caller; does any outage reach a
  persisted replacement, a not-found response, an admission guard or a silent monitor?
- **A failure after commit is not proof the work did not happen.** Signal: a status
  write, post-commit lookup or `finally` cleanup inside the catch that marks FAILED; a
  rejection handler that archives or recreates by ID. Proof: commit the primary write,
  then fail each later step and the response, and follow the stored state through the
  real retry; does the retry send, create or delete a second time?
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
  candidate windows, a cursor on creation time over rows that keep changing,
  best-of-many ranking, stored-candidate unions, and a slower full-refresh backstop.
  Proof: enumerate unknown-to-stored transitions for every excluded candidate class and
  compare both omission and substitution outcomes against a full refresh.
- **A deadline bounds only the work that observes it.** Signal: a client timeout, abort
  signal, queue visibility window or lease around a handler that ignores cancellation;
  uncapped provider retries; optional calls awaited beside required work; loops that
  keep issuing writes after the deadline. Proof: trace the deadline through every retry,
  provider call and post-deadline loop; stall each optional call. Does the required work
  still fit the budget, and does any side effect run after the caller, lease or lock
  gave up?
