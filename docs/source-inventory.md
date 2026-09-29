# Source inventory

Original uploads are reference material and are not included in this package. Hashes identify the inspected versions.

| File | Bytes | SHA-256 | Role |
|---|---:|---|---|
| Pasted markdown(4).md | 139154 | 0d72171eca57b127b19cef6daf8bb78d996bab4053d7e0f1bdb908d81b3742e5 | Prior-chat context; superseded details defer to current instructions |
| Pasted text (2).txt | 53527 | 361d39d93097a7d2c813cf2542075818ca33ca9300b451ba4082512236568509 | Master requirements, 76 sections |
| PostgreSQL-CheatSheet(2).docx | 48155 | 036274d47af4e2250719503f4b5665412a6256de1117cf19fb69854ab5fb7afe | 20-section PostgreSQL teaching checklist |
| BDM2026-main.zip | 36642 | ce3b145b8e15f48b6e518f099d53a3662287f447a411e57e958ea5d0cb6e7f83 | Professor SQL/Python worked examples |
| 23BA044E-Business Data Management.pdf | 944059 | 8322248f66866afef7eff07448230c8858ce23ae36272aea214000f9892ae7f4 | Official 19-page course outline |
| Playo_BDM_Capstone_Full_Execution_Plan.md | 37961 | 66647d9c394f679a325a53b3fe2185de874d7af353b0ea0f5c0f203119a6f498 | Detailed sequential execution roadmap |

## Professor ZIP

9 SQL scripts, 8 Python scripts, 2 Markdown files and .gitattributes.

- `BDM2026-main/.gitattributes`
- `BDM2026-main/README.md`
- `BDM2026-main/bike_rental_schema.sql`
- `BDM2026-main/midterm-topics/Articles-Midterm.md`
- `BDM2026-main/pgtopython/01_explore_tables.py`
- `BDM2026-main/pgtopython/02_aggregates.py`
- `BDM2026-main/pgtopython/03_where_filters.py`
- `BDM2026-main/pgtopython/04_joins.py`
- `BDM2026-main/pgtopython/05_group_by.py`
- `BDM2026-main/pgtopython/06_having_subqueries.py`
- `BDM2026-main/pgtopython/07_cte_window.py`
- `BDM2026-main/pgtopython/connecttosql.py`
- `BDM2026-main/session10.sql`
- `BDM2026-main/session11a.sql`
- `BDM2026-main/session11b.sql`
- `BDM2026-main/session12.sql`
- `BDM2026-main/session5.sql`
- `BDM2026-main/session7.sql`
- `BDM2026-main/session8.sql`
- `BDM2026-main/session9.sql`

The mobility example has stations, bikes, riders, rentals, climate_readings and traffic_indicators; session5 uses supermarket products/customers/payment modes/invoices with JSONB. The Python examples use psycopg2 and dotenv/environment configuration. Sessions cover filtering, joins, grouping, subqueries, CTEs, windows, views and materialized views. These examples guide teaching style; they are not Playo source records. Do not run sample destructive statements against the live project.

## Interpretation safeguards

Some teaching explanations simplify query planning and NULL behavior. In implementation use actual PostgreSQL behavior: correlated subqueries may be optimized; NOT IN with NULL is not generally equivalent to NOT EXISTS. Do not promise index acceleration on small tables.
