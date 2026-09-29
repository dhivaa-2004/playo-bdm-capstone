# Proposed architecture — not yet deployed

## Scope

Support venue exploration, source-aware analytics and an academically defensible prediction task. The name refers to the team's selected business; this is an independent student project, not an official Playo service.

| Layer | Proposed responsibility | Current implementation |
|---|---|---|
| Acquisition | Import permitted raw files; network collector only after source permission/access review | offline importer only |
| Raw evidence | Original files, capture timestamp, URL, permission reference, content hash | importer retains original input bytes |
| Python | Parse, normalize, validate, separate provenance, load in transactions | normalization/validation and JSONL outputs |
| PostgreSQL staging | Private raw JSONB, ingestion runs, errors and lineage | planned |
| Relational core | Venue/city/sport/amenity entities and observation history | provisional |
| SQL EDA | Database-side statistics, joins, CTEs, windows and quality queries | planned |
| Feature layer | Reproducible dated SQL feature snapshots with train/test membership | planned |
| ML | Read PostgreSQL, fit train-only preprocessing and model, evaluate holdout | planned |
| Predictions | Dedicated table with model/feature lineage and validity state | planned |
| Application | Domain-separated React/TypeScript UI, Supabase data services, public safe reads, admin writes | planned |
| Delivery | Public GitHub; public website; private secrets | repository created; website planned |

## Data boundary

Raw observations, source evidence, internal run details and admin records stay private. Public views expose only approved fields. Unknown/missing numeric values remain NULL. Every aggregation is scoped by source type, with an explicit combined-data label if a combined view is selected.

Ordinary user edits must not silently rewrite scraped/source evidence. Preserve original observations; record curated changes with editor/time/reason and label them as overrides. Archive venues rather than destroy lineage. Invalidated features/predictions must become visibly stale after relevant edits.

## SQL and application organization

Use `sql/migrations`, `sql/eda`, `sql/features`, `sql/demos`; `pipeline` and `ml` are separate Python domains. UI domains: venues, cities, sports, analytics, predictions, data-quality, administration. Database calls belong in services/hooks, not chart components. Prefer server-side filters and pagination, database aggregates and explicit cache invalidation.

## Security design

Public reads require deliberate field-level exposure and RLS. Authenticated does not automatically mean admin: use a protected admin membership table, not editable user metadata. Policies must enforce every write. Browser code gets only the publishable key. Database connection strings and privileged keys stay in protected environment variables. Avoid security-definer views/functions unless reviewed; ensure views do not bypass underlying RLS. SQL parameterization is required.

## Hosting

Hosting selection is deferred until the live data and application requirements are ready. The user requested a free option where available. No paid infrastructure or billing change is authorized by this design. GitHub-to-Supabase integration is optional deployment wiring, distinct from authenticated access to both accounts.

## Resource efficiency

Stream input, batch transactional loads, avoid full-table browser downloads, keep SQL feature computation inside PostgreSQL, compare simple models first, and refresh materialized results only when required. Record runtimes and transferred rows; do not claim measured carbon reductions without measurements.
