# Playo BDM Capstone

Independent MBA Business Data Management study using historical third-party Playo-related records. Supabase is the application's data source. This is not an official Playo product or a source of current booking availability.

**Current release:** The complete public, no-sign-in application is deployed independently at [playo-venue-observatory.dhivaa2004.workers.dev](https://playo-venue-observatory.dhivaa2004.workers.dev). Historical ETL, the normalized database, SQL EDA, feature store, grouped ML evaluation, prediction write-back, contextual explanations, comparison views, SQL/data lineage, clustered venue map, moderated community submissions, correction reports, Turnstile protection and automated Cloudflare deployment are implemented. See [current status](docs/status.md) and [verification evidence](docs/test-results.md).

**Team handoff:** Start with the [teammate guide](docs/team-guide.md), or download the final [presentation](deliverables/Playo_BDM_Capstone_Team_Presentation.pptx), [Word study guide](deliverables/Playo_BDM_Capstone_Teammate_Guide.docx), [PDF study guide](deliverables/Playo_BDM_Capstone_Teammate_Guide.pdf) or [verified Supabase ER diagram](deliverables/Playo_Supabase_ER_Diagram.png). All presentation and guide text uses Arial.

## 1. Project Overview
Explore 3,697 exact-deduplicated historical candidate venue records across four source regions, with 89 activity/service labels. They are not guaranteed distinct real-world businesses.

## 2. Business Problem
Understand geographic coverage, activity offerings, rating evidence and dataset limitations, and test whether available attributes contain a modest rating-estimation signal. The dataset cannot measure bookings, demand, revenue or price.

## 3. Objectives
Preserve provenance; normalize the empirical dataset; perform SQL EDA; evaluate leakage-safe regression against dummy baselines; present live database results and separately controlled curation records.

## 4. Data Source
User-supplied `playo-find-venue-master.zip`, a historical third-party export. Its observation dates are unknown. Current public Playo pages were reviewed only as domain/schema references. No automated collection was performed. Raw archives, source files and phone/contact HTML are excluded from this public repository; independent data redistribution rights were not established.

## 5. Data Audit
3,701 raw rows → four exact duplicate extras removed → 3,697 records: 3,186 rated and 511 unrated. Zero/count-zero ratings become missing targets. Three missing provider IDs use deterministic fallback identities. See [audit](docs/historical-data-audit.md), which is a dated pre-implementation artifact, and [gap analysis](docs/current-required-gap.md).

## 6. Architecture
Immutable private archive → Python normalization → Supabase/PostgreSQL → SQL EDA and versioned feature view → Python ML → PostgreSQL predictions → React/TypeScript dashboard. Admin workspace notes remain outside the empirical pipeline.

## 7. PostgreSQL / Supabase
Existing project: `qztngersjtzropfjbcnl`. Normalized venues, ratings, source regions and activity junctions; private ingestion/lineage; model runs and predictions; admin-owned workspace and audit. All tables have RLS. Views use `security_invoker=true`. [Database design](docs/database-design.md) describes keys and access.

## 8. SQL EDA
Database-side counts, joins, grouping, conditional aggregates, CTEs, window examples, mean, median, quartiles, sample variance/standard deviation and Pearson correlation. Public functions return bounded search results and aggregates. See `sql/eda/` and migrations.

## 9. Feature Store
`public.feature_store_v1`, one record per historical candidate. Inputs: source region, latitude, longitude and activity indicators. Target: `avgRating`, NULL when unrated. Entity grouping conservatively joins same-region normalized names or exact coordinates. Exclude `info`, truncated `rating`, identifiers, URLs, names, icons and ratingCount from initial predictors. Rating count is used only for sensitivity. [Protocol](docs/feature-store-and-evaluation.md).

## 10. Machine Learning
Run `18a83a41-064d-4b9d-a4ad-054b37c5520e`: seed 42, 2,547 training records and 639 held-out records, with zero entity-group overlap. Five-fold grouped training CV selected a random forest against mean, median and Ridge baselines. Held-out MAE **0.4655 stars**, RMSE **0.6102**, R² **0.1633**; median baseline MAE **0.5169**. This is modest explanatory performance. Regional and rating-count-threshold sensitivity and package versions are recorded in `audit/historical/model-evaluation.json`. No retraining was performed for the website revision.

## 11. Prediction Write-back
3,697 persisted outputs: 2,547 in-sample training, 639 held-out test, 511 unrated inference. Only test rows support evaluation. Each output has a venue ID, run ID, split and feature hash. Run metadata carries feature version, dataset/training hashes and parameters. Python generated atomic write-back SQL; it was applied through the database-owner SQL interface. A direct psycopg write-back session has not been verified.

## 12. Website
Source: `frontend/`. Public routes include `/`, `/venues`, `/venues/:id`, `/map`, `/compare`, `/analytics`, `/lineage`, `/sports`, `/cities`, `/predictions`, `/data-quality`, `/add-venue`, `/submitted-venues` and `/report`. Existing compatibility aliases remain. The explorer has SQL search, URL-based filters, browser-local saved views, stable sorting and pagination. Individual venues can be added to a browser-local comparison. The map clusters nearby points at lower zoom without hiding coordinate-less records from the normal list. Explanations are generated from the evidence visible in each view rather than copied from one fixed template. Activities and source regions are queried from the database, not baked-in listings. No raw HTML/phones, synthetic fills, chatbot or booking features. A site-wide theme control supports persistent manual Light/Dark selection and an Auto mode that uses the visitor's local clock: light from 06:00 to 17:59 and dark from 18:00 to 05:59.

## 13. Authentication / RLS
The public frontend has no sign-in and cannot access private curation records. Turnstile, validation, column-limited grants, triggers and RLS protect public submission/report inserts; no service-role key is used. New venues start as `pending`, and only database-owner-approved records can be read publicly. Historical tables remain read-only to the application. [Operations](docs/operations.md).

## 14. Data Quality
Raw files remain unchanged and private. Lineage preserves every raw row and archive/member/record hashes. Public quality reports contain aggregate audit evidence, refreshed by an ingestion trigger. No synthetic records are loaded; missing historical fields remain missing. Source regions do not establish municipal boundaries or represent India as a whole.

## 15. Repository Structure
- `pipeline/`: historical parser and SQL-view reader; earlier generic importer retained as a prototype.
- `ml/`: baseline and grouped regression experiment.
- `sql/migrations/`: original schema, dashboard and chunked import definitions.
- `supabase/migrations/`: additive admin and quality-report migrations created with Supabase CLI.
- `sql/eda/`, `sql/tests/`: SQL analysis and transaction-scoped access tests.
- `frontend/`: dashboard, API routes, build files and pnpm lockfile.
- `docs/`, `audit/historical/`: methodology and non-sensitive aggregate evidence.
- `docs/assets/`: verified production screenshots plus a reproducible PNG/SVG ER diagram of the live Supabase schema.
- `deliverables/`: final Arial presentation and teammate study guide in Word/PDF formats.
- Ignored: raw data, generated row-level artifacts, model binary, actual environment files and dependencies.

## 16. Local Setup
Python 3.10+ for ingestion tests; use the recorded model package versions for reproducing the ML experiment. Node 22+ and the frontend's pinned package manager for the website.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python -m unittest discover -s tests -v
# Supply your own permitted archive; never commit it.
python scripts/audit_historical.py /path/to/playo-find-venue-master.zip --output audit/historical
cd frontend
cp .env.example .env
# Populate the local environment securely.
pnpm install --frozen-lockfile
pnpm dev
```

The existing hosted database is already loaded. Do not reset it or replay all migrations blindly. For a separate empty project, apply original migrations in dependency order 001, 003, 002, then the timestamped additions. The historical parser and model script have `--help` for explicit input/output paths. Reproduction is separate from the existing approved experiment.

## 17. Environment Variables
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` configure the production Worker. Optional `DATABASE_URL` enables the psycopg SQL-view reader; otherwise the Python pipeline reads PostgREST with pagination. Actual keys, passwords, access tokens and `.env` files must never be committed. Production secrets are stored as Cloudflare Worker secrets; GitHub Actions creates or reuses the Turnstile widget during deployment.

## 18. Testing
16 Python unit tests and 13 frontend unit/validation tests pass. Live, rollback-scoped SQL acceptance verifies pending/approval visibility, correction reports, public-write hardening, moderation timestamps, rejection-note enforcement, lineage, quality diagnostics, model diagnostics, 3,697 map points and stored model explanation. Five Playwright/Axe browser checks verify public navigation without sign-in, persistent theme selection with atomic contrast-safe switching, contextual lineage tabs, aggregate export, security headers and serious accessibility violations after every successful production deployment. The production form also created a clearly labelled pending row in Supabase; that exact demonstration row was moderated and then deleted, leaving no test residue. TypeScript, lint with no errors and the production build pass. See [test evidence](docs/test-results.md).

## 19. Deployment
GitHub `main` is the source of truth. GitHub Actions tests and deploys the generated Worker to Cloudflare; a second workflow runs Chromium and Axe against the deployed release. Dependabot, CodeQL and the daily production monitor provide ongoing maintenance checks. Supabase remains the database. Production: [playo-venue-observatory.dhivaa2004.workers.dev](https://playo-venue-observatory.dhivaa2004.workers.dev). Source and build must match; secrets and raw archives are excluded. Public site access never makes private database tables writable.

## 20. Limitations
Unknown collection dates; geographic selection bias; sparse ratings; no verified current availability; no booking/revenue/timing/amenity evidence; uncertain entity identity; modest predictive power. In-sample predictions and unrated inference are not accuracy evidence. There is no full-data refit or operational model monitoring. Community submissions are claims reviewed by the database owner and are not merged into empirical KPIs or ML.

## 21. Future Work
Optional 400 fictional demonstration records remain deferred and would require separate provenance, badges and exclusion from empirical KPIs/ML. Additional empirical features should be added only from authorized sources. No synthetic expansion is required for the current project.

## 22. Honest Project Positioning
This is an academic observatory built from a historical third-party Playo-related dataset. The current Playo website was used only as a domain/schema reference; it was not scraped. Historical rows, community submissions and any future synthetic demonstration data must remain visibly separate. The model estimates recorded historical ratings from limited attributes and must not be described as predicting demand, bookings, revenue or current venue quality.

## 23. Numbered Project Handoff Package
The private handoff ZIP is organized in the actual project order: original inputs → untouched raw archive → audit and cleaning → structured Supabase data → SQL analysis → ML → web application → GitHub/Cloudflare deployment → images → presentation and guide → verification → complete GitHub source. See [archive structure](docs/archive-structure.md).

Run `python scripts/build_handoff_package.py --uploads /path/to/upload --output /path/to/package` to rebuild it. The package intentionally remains outside the public repository because it contains the original historical archive and structured row-level derivatives. It never includes `.env`, `.dev.vars`, database passwords, service-role keys, Cloudflare tokens, Git metadata, dependencies or build caches.
