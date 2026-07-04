# dbt Transformations Focus Pack

Load when the PR touches `dbt_project.yml`, `models/`, `macros/`, `snapshots/`, `seeds/`, `analyses/`, dbt schema/properties `.yml` files, or PR context mentions dbt. Pair with the SQL semantics pack for the queries themselves; this pack covers the dbt layer.

Look for:

- Incremental correctness: `is_incremental()` branches whose results diverge from a full refresh, wrong or missing `unique_key`, late-arriving data outside the lookback window, incremental predicates that silently drop updated rows.
- Materialization changes (view, table, incremental, ephemeral) without accounting for downstream freshness, cost, or behavior differences.
- Renamed or removed models and dropped or retyped columns with no check of downstream consumers: trace `ref()` usage, exposures, metrics, and anything BI-facing before treating the change as contained.
- Hardcoded schema or table names where `ref()` or `source()` belongs; they break lineage, environment separation, and deferred builds.
- Test and contract drift: changed model logic with no matching schema test updates, `unique`/`not_null`/`relationships` tests quietly deleted, contracts or column descriptions no longer matching the SQL.
- Jinja hazards: `target.name` branches that behave differently in prod than in dev or CI, macro signature changes that break other callers, quoting or whitespace-control changes inside Jinja blocks.
- Snapshot strategy problems: `timestamp` strategy on a column that does not reliably update, `check` strategy missing columns, hard deletes unhandled.
- Seed changes that rewrite reference data without noting the downstream effect.

Good findings identify the affected downstream models or consumers, state how the incremental and full-refresh paths diverge, and suggest the smallest safer direction: add the unique key, widen the lookback, restore the test, split a rename into add-then-remove.

Defer orchestration and scheduling concerns to the background jobs and queues pack, raw query-logic concerns to the SQL semantics pack, and scan-cost concerns to the warehouse cost and performance pack.

Reference basis: dbt guidance on incremental models, testing, and lineage.
