# Verification evidence — 1 October 2026

Final release commit: [`fb207d7`](https://github.com/dhivaa-2004/playo-bdm-capstone/commit/fb207d7daf742ebe301b132671fa209b626b90d8). The release preserves the original historical dataset and adds evidence exploration, lineage, diagnostics, saved comparisons, a clustered map, security headers, automated browser checks and contrast-safe manual/automatic themes.

| Check | Executed result |
|---|---|
| Python ingestion unit tests | 16/16 passed with `python -m unittest discover -s tests -v` |
| Frontend validation tests | 13/13 passed, including route allow-listing, exact 06:00/18:00 automatic-theme boundaries, public-field validation, Turnstile requirements and correction-report rules |
| TypeScript | `tsc --noEmit` passed |
| Lint | Completed with zero errors; 11 non-blocking framework/style warnings remain documented in CI output |
| Worker production build | Passed from the pinned pnpm lockfile |
| Post-deployment browser suite | 5/5 passed: public navigation without sign-in, persisted/atomic theme switching, interactive lineage tabs, CSV/security headers and serious/critical Axe checks |
| Cloudflare deployment | [Workflow 36849456396](https://github.com/dhivaa-2004/playo-bdm-capstone/actions/runs/36849456396) completed successfully |
| Browser and accessibility workflow | [Workflow 36849558049](https://github.com/dhivaa-2004/playo-bdm-capstone/actions/runs/36849558049) completed successfully |
| CodeQL | [Workflow 36849456578](https://github.com/dhivaa-2004/playo-bdm-capstone/actions/runs/36849456578) completed successfully |
| Production route smoke | `/`, `/venues`, `/map`, `/compare`, `/lineage`, `/predictions` and `/data-quality` returned HTTP 200 |
| Production APIs | Health, lineage, quality-detail and model-diagnostic endpoints returned HTTP 200 with database results |
| Response security | CSP, HSTS, COOP, Permissions-Policy, Referrer-Policy, `nosniff` and frame-denial headers verified in production |
| Live database counts | 3,697 historical; 3,186 rated; 511 unrated; zero synthetic |
| SQL acceptance | Rollback-scoped checks passed for pending/approval visibility, moderation timestamps, rejection notes, correction reports, public-write hardening and aggregate diagnostic RPCs |
| Production submission flow | Clearly labelled test venue reached `submitted_venues` as `pending`, was moderated, and was deleted; exact UUID `1e85f203-bb7e-44ac-b921-4a9e9a257ac9` has zero remaining rows |

## Database integrity

The migration and acceptance checks did not change empirical records, ratings, activity memberships, model runs or predictions. Transaction-scoped fixtures were rolled back. Community submissions remain outside historical KPIs and primary ML. The original production demonstration row was removed after verification.

## Browser evidence

The live release was also inspected directly in both themes. Comparison data loaded for selectable regions; the lineage page loaded the archive hash, parser result, normalized-table counts, feature-store treatment and model identity; SQL evidence tabs expanded interactively. Light and dark appearance changes now apply atomically, so panels and controls do not pass through a temporary low-contrast color state.

## Advisor interpretation

Supabase reported no public-table security errors. Deliberately private/default-denied tables can produce informational policy notices, and unused-index notices remain informational for a small academic dataset. The no-login frontend does not use the Auth leaked-password feature.

References: [private tables without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
