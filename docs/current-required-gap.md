# Historical implementation plan — closed 2 October 2026

This file preserves the 30 September implementation plan for traceability. Its gaps are closed; use `README.md`, `docs/status.md` and `docs/test-results.md` for the current state. No rebuild, synthetic expansion or ML retraining was required.

| Area | 30 September starting point | Closed outcome |
|---|---|---|
| Historical data | 3,697 records; 3,186 rated; 511 unrated; 89 labels; four source regions; zero synthetic | Preserved with private 3,701-row raw lineage and unchanged analytical counts |
| Model | Existing grouped evaluation and 3,697 predictions | Preserved; split summaries, hashes, diagnostics and limitations are exposed |
| Database | Normalized tables, checks, FKs, RLS, invoker views | Indexes, aggregates, moderation tables, unified venue discovery and source-separated activity counts implemented |
| Access | Workspace authorization required hardening | Explicit server-controlled membership, ownership checks and public no-sign-in boundaries implemented |
| Accounts | Zero application users; zero workspace records | Public application intentionally has no sign-in; private workspace remains outside public routes |
| Website | Core analytical pages existed | Required aliases, filters, sorting, map, comparison, lineage, diagnostics, moderated submissions and approved-community discovery implemented |
| Data origin | Some UI values were hardcoded | Region, activity and discovery counts read from Supabase |
| Search | SQL pagination and basic filters | Bounded pagination, stable sorting, rating/source/region/activity filters and community discovery validated |
| Public content | Sanitized tables; raw HTML/phones absent | Exclusion preserved |
| GitHub | Some pipeline and website changes were local | Source, migrations, lockfile, workflows, documentation and final deliverables published; secrets/raw archives excluded |
| Verification | Earlier Python and RLS/CRUD checks passed | 16 Python tests, 15 frontend tests, SQL acceptance, typecheck, lint, build, browser/accessibility and live API checks pass |
| Deployment | No successful deployment verified | `main` deploys successfully to the independent Cloudflare Worker URL |

The final PPT and teammate guide are in `deliverables/`. No new empirical collection, synthetic records or ML retraining was added. Database account membership is not inferred from GitHub or Supabase project ownership. Public access never grants administrator privileges.
