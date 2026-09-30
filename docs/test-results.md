# Verification evidence — 30 September 2026

| Check | Executed result |
|---|---|
| Python ingestion unit tests | 16/16 passed |
| Live database counts | 3,697 historical; 3,186 rated; 511 unrated; zero synthetic |
| Database public API | Five read endpoints returned HTTP 200; 89 activities, four regions, one quality report and one model run |
| Role/RLS transaction tests | Anonymous SELECT permitted; INSERT/UPDATE/DELETE denied; admin owner CRUD allowed; non-admin and self-elevation denied; cross-admin rows inaccessible; historical updates denied; three audit events; rollback |
| Public SQL RPC tests as anon | Search v2 returned 20 paginated rows; quality and prediction aggregates returned expected counts |
| Model predictions | 2,547 train; 639 test; 511 inference, same existing model run |
| Query-plan sample | Search RPC with court/Chennai/rating sort: 17.874 ms execution; not a load benchmark or speedup comparison |
| TypeScript | tsc --noEmit passed |
| Worker production build | Passed; 4 app/API routes, catch-all maps required pages |
| Credential scan | Actual publishable key absent from tracked source and built artifacts |
| Security advisor after fixes | Zero WARN/ERROR; four INFO notices for deliberately default-denied private tables |
| Performance advisor | Four INFO unused-index notices; recently created indexes and small dataset; not evidence to delete FK indexes |
| Browser preview | Shell/routing and explicit error state visible. Outbound server fetch returned an internal runtime error; live-data interaction and responsive acceptance not passed |
| Production publication | Native deployment succeeded; external API tests blocked by edge HTTP 403 / 1010; live data not verified through the deployed server |
| Real-user auth and UI CRUD | Not executed: no application Auth user or administrator exists yet |

Fixtures in SQL tests are disposable, transaction-scoped and never presented as historical data. Test rollback left zero application users and workspace records. No secrets or raw HTML/phone fields are included in test output.

Advisor references: [private tables without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). The public quality-report SECURITY DEFINER warnings were resolved by replacing privileged reads with a public aggregate report and invoker RPC.

Browser QA remains a limitation, not a passing test. Production HTTP verification is recorded separately in status.md and audit/historical/production-smoke.json when available.
