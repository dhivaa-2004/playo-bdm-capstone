# Current versus required — 30 September 2026

Inspected the existing public repository, local website and live Supabase project using authenticated connectors. No rebuild or synthetic expansion is required.

| Area | Current verified state | Required change |
|---|---|---|
| Historical data | 3,697 records; 3,186 rated; 511 unrated; 89 labels; four source regions; zero synthetic | Preserve records and private 3,701-row lineage |
| Model | Existing grouped evaluation and 3,697 predictions | Preserve trained experiment; expose split-specific summaries and traceability |
| Database | Normalized tables, checks, FKs, RLS, invoker views | Add missing FK indexes and analytical aggregates |
| Access | Owner-only workspace policies allow any authenticated account to write | Add explicit server-controlled admin membership; retain ownership |
| Accounts | Zero application users; zero workspace records | User must register an account before an intended administrator can be bound |
| Website | Overview, explorer, detail, analysis, model, quality and workspace implementations | Add required route aliases, activities, regions, admin, sorting and rating filters |
| Data origin | Region labels and synthetic KPI hardcoded in UI | Read these values from the database |
| Search | SQL pagination and basic filters | Validate pagination; add rating filter and stable sorting |
| Public content | Sanitized tables; raw HTML/phones absent | Preserve exclusion |
| GitHub | Public audit foundation; pipeline and website changes still local | Publish current source, migrations, lockfile and accurate documentation; exclude raw archives, artifacts and secrets |
| Verification | Earlier 16 Python tests and transaction-scoped RLS/CRUD passed | Repeat affected security tests with admin roles; typecheck/build and browser checks |
| Deployment | Site registered; environment configured; no successful deployment verified | Deploy after validation and verify actual URL |

No PPT, new empirical collection, synthetic records, or ML retraining is planned. Database account membership is not inferred from GitHub or Supabase project ownership. Public sign-up never grants administrator privileges.
