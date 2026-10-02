# Verification evidence — 2 October 2026

Application release commit: [`bdc35bb`](https://github.com/dhivaa-2004/playo-bdm-capstone/commit/bdc35bb009a1abae2710ca5e65a222046078f34f). The release preserves the original historical dataset and adds approved-community discovery to Venue Explorer, details and comparisons, plus source-separated Activities & Services counts. Pending/rejected submissions remain undiscoverable and historical KPIs/ML remain unchanged.

| Check | Executed result |
|---|---|
| Python ingestion unit tests | 16/16 passed with `python -m unittest discover -s tests -v` |
| Frontend validation tests | 15/15 passed, including route allow-listing, exact 06:00/18:00 automatic-theme boundaries, public-field validation, Turnstile requirements, correction-report rules, simplified-sidebar/spacing hooks, contextual-photo references and visual-asset size budgets |
| TypeScript | `tsc --noEmit` passed |
| Lint | Completed with zero errors; 11 non-blocking framework/style warnings remain documented in CI output |
| Worker production build | Passed from the pinned pnpm lockfile |
| Post-deployment browser suite | 5/5 passed: public navigation without sign-in, persisted/atomic theme switching, interactive lineage tabs, CSV/security headers and serious/critical Axe checks |
| Venue discovery regression | Three discovery specifications pass; the pull-request workflow runs the two browser fixture checks without creating production submissions |
| Cloudflare deployment | [Workflow 36968976838](https://github.com/dhivaa-2004/playo-bdm-capstone/actions/runs/36968976838) completed successfully |
| Browser and accessibility workflow | [Workflow 36969038464](https://github.com/dhivaa-2004/playo-bdm-capstone/actions/runs/36969038464) completed successfully |
| CodeQL | [Workflow 36968976840](https://github.com/dhivaa-2004/playo-bdm-capstone/actions/runs/36968976840) completed successfully |
| Production route smoke | `/`, `/venues`, `/map`, `/compare`, `/lineage`, `/predictions` and `/data-quality` returned HTTP 200 |
| Production APIs | Unified search returns historical plus approved-community totals; community-only search returns HTTP 200; a pending-source filter returns HTTP 400; the activity directory exposes historical, approved-community and combined counts |
| Response security | CSP, HSTS, COOP, Permissions-Policy, Referrer-Policy, `nosniff` and frame-denial headers verified in production |
| Live database counts | 3,697 historical; 3,186 rated; 511 unrated; zero synthetic |
| SQL acceptance | Rollback-scoped checks passed for pending/approved/rejected visibility, community discovery filters, pagination, activity arithmetic, moderation rules and unchanged historical/features/predictions |
| Production submission flow | Clearly labelled test venue reached `submitted_venues` as `pending`, was moderated, and was deleted; exact UUID `1e85f203-bb7e-44ac-b921-4a9e9a257ac9` has zero remaining rows |

## Database integrity

The migration and acceptance checks did not change empirical records, ratings, historical activity memberships, model runs or predictions. Transaction-scoped community fixtures were rolled back. Community submissions remain outside historical KPIs and primary ML. The original production demonstration row was removed after verification. The live database check on 2 October returned 3,697 historical venues, zero approved community venues and zero pending community venues.

## Browser evidence

The live release was inspected directly after deployment. Venue Explorer displays “3,697 historical + 0 approved community,” exposes the source filter and labels historical rows. Activities & Services displays Historical, Approved community and Total venues columns with the expected arithmetic. The community-only API returns an empty successful result because there are currently no approved submissions; a pending-source query is rejected. Light and dark appearance changes continue to apply atomically.

## Advisor interpretation

Supabase reported no public-table security errors. Deliberately private/default-denied tables can produce informational policy notices, and unused-index notices remain informational for a small academic dataset. The no-login frontend does not use the Auth leaked-password feature.

References: [private tables without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
