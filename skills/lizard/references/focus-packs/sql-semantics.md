# SQL Semantics Focus Pack

Load when the PR changes `.sql` files or embedded SQL query strings in application code, in any repo: analytical models, reports, migrations containing data-shaping queries, or app queries beyond trivial CRUD.

Look for:

- Join fan-out that changes grain: a one-to-many join duplicating rows into downstream aggregates, or a `DISTINCT` added to mask fan-out instead of fixing the join or grain.
- `LEFT JOIN` silently becoming an inner join because a `WHERE` clause filters on the right table's columns; the filter belongs in the `ON` clause or a pre-filtered subquery.
- NULL traps: `NOT IN` with a NULL in the list matching nothing, `COUNT(col)` vs `COUNT(*)` on nullable columns, `!=` comparisons dropping NULL rows, `COALESCE` defaults masking upstream data problems.
- Window functions: wrong `PARTITION BY` or `ORDER BY` for the stated intent, the default `RANGE` frame double-counting ties where `ROWS` was intended, `ROW_NUMBER` dedup with a non-deterministic ordering (missing tiebreaker).
- Set operations and arithmetic: `UNION` deduplicating where `UNION ALL` was intended (or the reverse), integer division truncating, division by zero on empty or filtered groups.
- Date and time boundaries: `BETWEEN` on timestamps clipping the final day, closed ranges where half-open (`>= start AND < end`) was intended, timezone-naive comparisons across zones or DST.
- Implicit casts, collation, and case sensitivity changing match or join behavior, especially in queries meant to run on more than one dialect.

Good findings name the rows that get duplicated, dropped, or misbucketed, sketch a concrete input that goes wrong when short, and suggest the smallest safer rewrite: fix the join key or grain, move the filter into the `ON` clause, use a half-open range, add the tiebreaker.

Reference basis: standard SQL semantics and common analytical query defects.
