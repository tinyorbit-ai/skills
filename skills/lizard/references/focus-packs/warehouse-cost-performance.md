# Warehouse Cost and Performance Focus Pack

Load when the PR changes models or queries against a cloud warehouse (Snowflake, BigQuery, Redshift, Databricks) where scan volume is billed, especially large fact tables, clustering or partitioning config, or full-refresh and backfill behavior.

Look for:

- Pruning killers: functions or casts wrapped around partition/cluster filter columns, missing partition filters on large tables, filters applied after an exploding join instead of before it.
- `SELECT *` propagating wide tables through the DAG, or persisted into a table or incremental materialization that now stores every column.
- Join explosions: many-to-many joins on low-cardinality keys, unbounded date-range joins, cross joins hiding behind a missing join condition.
- Full-refresh or backfill cost on large incremental models: a logic change that forces reprocessing all history without noting the cost or providing a bounded backfill path.
- Clustering or partitioning key changes without noting the recluster/rewrite cost, and `ORDER BY` or `DISTINCT` over large intermediates that will spill.
- Repeated scans of the same large source that a single staging model or CTE could serve.

Good findings state the blast radius in relative terms (full scan vs pruned partition, all history vs one increment), name the table whose size drives the cost, and suggest the smallest safer direction: push the filter down, keep the raw column available for pruning, bound the backfill, stage the shared scan.

Reference basis: cloud warehouse pruning and cost optimization guidance.
