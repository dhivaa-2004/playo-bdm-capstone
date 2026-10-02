# Academic coverage matrix

This matrix separates implemented capstone evidence from optional laboratory topics. An item is not described as complete merely because the course mentions it.

| Outcome / topic | Implemented evidence | Location | Honest boundary |
|---|---|---|---|
| Relational modelling and normalization | Regions, venues, ratings, activity labels and junctions with keys, checks and foreign keys | `sql/migrations/`, `docs/database-design.md` | Candidate venues are historical records, not guaranteed distinct businesses |
| Provenance and reliability | Immutable raw archive policy; archive/member/record hashes; quality report; source flags | `pipeline/`, `audit/historical/`, lineage page | Raw files and contact-bearing HTML are private |
| SQL filtering, grouping and aggregates | Region/activity statistics, rating distributions, NULL-aware summaries | `sql/eda/`, SQL analysis page | Unrated means missing target, never zero stars |
| Joins, CTEs and windows | Normalized analytical queries and ranking/window examples | `sql/eda/` | Rankings describe the sample, not national market quality |
| Python ELT and validation | Deterministic parser, exact deduplication, normalized chunk generation and tests | `pipeline/`, `scripts/`, `tests/` | Four exact duplicate extras removed; no synthetic fill |
| Database security | RLS, invoker views/RPCs, constrained grants, validation and moderation triggers | `supabase/migrations/`, `sql/tests/` | Public site has no admin privileges or service-role key |
| SQL feature store | One row per candidate, leakage-safe inputs, target and sensitivity variables | `public.feature_store_v1`, feature-store protocol | `rating_count` is sensitivity evidence, not an initial predictor |
| Supervised ML | Grouped train/test split, baselines, cross-validation, random forest, MAE/RMSE/R² | `ml/`, `audit/historical/model-evaluation.json` | Modest R²; estimates are not demand, revenue or current quality |
| Prediction write-back | Versioned run and 3,697 split-labelled outputs with feature hashes | `model_runs`, `predictions` | Only 639 held-out rows provide independent accuracy evidence |
| Application and communication | Live database dashboard, map, comparisons, contextual explanations and lineage | `frontend/` | Current Playo was schema reference only; no automated scraping |
| Operations and governance | Pending moderation, correction reports, Turnstile, monitoring, CodeQL, weekly dependency audit and backup runbook | `.github/`, `docs/operations.md`, `docs/backup-recovery.md` | Community rows never enter empirical KPIs or ML |

## Deliberately not claimed

- No booking, demand, revenue, price or time-series analysis is supported by the source.
- No vector-search or generative-AI feature was added because the historical text is repetitive, contact-bearing HTML and is excluded from the public layer.
- No synthetic expansion was needed for the core analysis.
- No causal or operational recommendation is inferred from the rating-estimation experiment.
