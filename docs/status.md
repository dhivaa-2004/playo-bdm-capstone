# Current status

Updated 30 September 2026. The historical audit is approved and the existing empirical data/model are preserved.

Completed: Python historical ETL; 3,697 normalized Supabase records with 3,701-row private lineage; SQL EDA and versioned feature store; entity-grouped baseline/regression experiment; 3,697 prediction rows; admin membership and owner RLS; database-backed route implementation; timestamped additive migrations; comprehensive README and operations documentation.

Security and database/API tests, 16 Python tests, TypeScript and production build passed. Zero synthetic records. No PPT created. See test-results.md for scope.

Production publication succeeded (version 2, including the navigation correction): https://playo-venue-observatory.dhivabalaguru.chatgpt.site . Native hosting status is succeeded with environment revision 1. Deployment success does not establish passing application acceptance. The local checkout includes the current pipeline, model methodology, migrations and frontend source. An earlier GitHub publication attempt stopped at an approval usage limit before any branch update. This source update contains the completed implementation and navigation correction.

Production HTTP smoke requests were rejected by the edge with HTTP 403 / error 1010 before application verification. Testing stopped; no alternate client or network bypass was attempted.

Remaining acceptance: preview outbound database fetch currently fails with an internal runtime error; responsive live-data UI checks are incomplete. Administrator onboarding is complete and the user supplied a screenshot of successful login and live dashboard data. Actual browser create/edit/archive acceptance remains unverified. Do not call the capstone fully complete until these checks are resolved.

## Auth follow-up — 30 September 2026
The intended administrator registered and confirmed their email. Protected admin membership was granted and public.is_admin() verified true under the account identity. Supabase Auth Site URL was changed from localhost:3000 to the deployed website and verified after reload. The user subsequently supplied a successful signed-in dashboard screenshot. CRUD acceptance remains pending.

## Sidebar navigation correction — 2026-09-30

Replaced client-router links with native document navigation for sidebar, cards, detail links and venue filters/pagination. TypeScript check passed. Browser clicks verified Venue explorer at /venues and SQL analysis at /analytics with the matching headings. Preview database access remains restricted; this navigation check does not claim a production data/CRUD test.

## Public access and independent hosting — 30 September 2026

Latest requested architecture: public dashboard and venue submissions without sign-in; GitHub source; existing Supabase database; standalone Cloudflare Worker. Public submission migration is applied and permission tests pass. Historical rows and ML remain unchanged. Frontend auth forms and private-workspace API access have been removed; private records remain protected in the database. The new form writes a separately labelled user_submitted/unverified record and the separate directory reads it. TypeScript, validation tests, standalone build and deploy dry-run pass.

Cloudflare account deployment is BLOCKED by its browser security-verification loop. No new independent URL or automatic GitHub deployment connection has been established. The older Sites version is still the last verified public URL; it has not been silently replaced or unpublished. Follow cloudflare-deployment.md to connect the prepared GitHub source. Final live save/read acceptance remains required.

Preview browser verified the public dashboard and Add a venue route with no sign-in controls. Form fields render; submission stays disabled when the preview cannot load live region/activity directories. The preview currently reports Database unavailable, so no browser save is claimed. The database rollback tests and 16 existing Python tests pass.
