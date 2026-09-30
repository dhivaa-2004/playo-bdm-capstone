> Planning reference from the audit phase. Implemented state and verification are documented in README.md, status.md and database-design.md; these supersede any pending or proposed statements below.

# PostgreSQL cheat-sheet mapping

All 20 sections mapped below. Paths are proposed and do not yet exist unless separately recorded in status.md. Status for every SQL row: PLANNED.

| Sheet section | Concept | Intended demonstration | Planned location |
|---|---|---|---|
| 1 | SELECT / clause order | Venue queries with correct WHERE vs HAVING | sql/eda/01_basics.sql |
| 2 | Data types | Exact counts/numerics, UTC timestamps, JSONB, UUID/key decisions | sql/migrations/001_core.sql |
| 3 | DDL | Schemas, PK/FK, checks, uniques, composite keys; ALTER in versioned migration | sql/migrations/ |
| 4 | DML | Transactional inserts/upserts and authenticated edit/archive | sql/operations/ |
| 5 | WHERE / dates | BETWEEN, IN, ILIKE, NULL, logical grouping and half-open dates | sql/eda/01_basics.sql |
| 6 | ORDER / LIMIT / OFFSET / DISTINCT | Stable venue pagination with unique tie-breaker | sql/eda/01_basics.sql |
| 7 | Expressions / functions | TRIM, LOWER, LENGTH, CAST, ROUND, CASE, date extraction | sql/eda/02_quality.sql |
| 8 | NULL rules | COALESCE presentation, NULLIF denominator, NOT EXISTS for missing relations | sql/eda/02_quality.sql |
| 9 | Aggregates / GROUP BY / HAVING | Counts and rating summaries by city/source; sample threshold | sql/eda/03_statistics.sql |
| 10 | Joins | Venue-to-sport many-to-many; missing data LEFT; matching same-city SELF | sql/eda/04_joins.sql |
| 11 | Subqueries | Above city average, EXISTS sports; scalar and derived tables | sql/eda/05_subqueries.sql |
| 12 | Set operators | UNION/ALL observations; INTERSECT/EXCEPT source coverage | sql/eda/06_sets.sql |
| 13 | CTEs | Multi-stage statistics; recursive location tree only if genuine hierarchy | sql/eda/07_ctes.sql |
| 14 | Windows | ROW_NUMBER/RANK/DENSE_RANK city ranking; LAG/LEAD actual snapshots; SUM/AVG/COUNT OVER | sql/eda/08_windows.sql |
| 15 | Views / materialized views | Feature and dashboard views; explicit refresh with freshness timestamp | sql/features/ and sql/migrations/ |
| 16 | Indexes | Query-driven single/composite indexes; EXPLAIN ANALYZE before/after | sql/performance/ |
| 17 | JSONB | Raw metadata ->, ->>, nested extraction, arrays, casts, containment | sql/eda/09_jsonb.sql |
| 18 | Transactions | BEGIN/COMMIT/ROLLBACK/SAVEPOINT in isolated disposable demonstration | sql/demos/transactions.sql |
| 19 | SQL categories | DDL/DML/DQL/DCL/TCL annotated in migrations/operations/demos | docs/sql-concept-mapping.md |
| 20 | Common mistakes | NULL filtering, JOIN count duplication, aggregate/alias rules and deterministic ordering | tests/database/ |

Use RIGHT/FULL/CROSS joins and destructive DDL only in useful analysis or clearly isolated demonstrations; never distort the production schema. Every final entry must add actual object/query ID, execution output and business purpose. No query is marked covered merely because a file is named.
