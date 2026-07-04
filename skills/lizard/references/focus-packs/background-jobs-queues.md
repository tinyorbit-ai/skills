# Background Jobs and Queues Focus Pack

Load when changed files or PR context mention workers, queues, scheduled jobs, task processors, async workflows, retries, dead-letter queues, backfills, or event consumers.

Look for:

- Non-idempotent work in paths that can be retried, redelivered, duplicated, or resumed after failure.
- Missing timeouts, cancellation checks, leases/heartbeats, or stuck-job handling for long-running work.
- Retry policies that amplify failures, hide permanent errors, or lose the original context.
- Message shape/version changes that old producers or consumers cannot tolerate.
- Missing ordering, concurrency, deduplication, or rate-limit controls.
- Insufficient observability for partial failure, poison messages, dead letters, or stuck batches.
- Sensitive data leaking into job payloads, logs, monitoring, or retry metadata.

Good findings explain the failure/retry scenario, name the duplicate/lost/stuck work risk, and suggest the smallest safer direction: idempotency keys, per-item status, bounded retries, dead-letter handling, timeouts, versioned payloads, or clearer operational signals.

Reference basis: task queue guidance on idempotency, acknowledgements, retries, and timeouts.
