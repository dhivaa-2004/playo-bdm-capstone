# Verification evidence — 30 September 2026

| Check | Executed result |
|---|---|
| Python ingestion unit tests | 16/16 passed |
| Frontend validation tests | 7/7 passed, including venue, Turnstile and correction-report input rules |
| Live database counts | 3,697 historical; 3,186 rated; 511 unrated; zero synthetic |
| Moderation transaction | Pending submission hidden; approved submission visible; fixture rolled back |
| Correction-report transaction | Public report insert accepted; fixture rolled back |
| Public-write hardening | No public SECURITY DEFINER write functions; browser columns limited by grants/RLS; validation triggers cover hidden pending rows |
| Venue map data | RPC returns 3,697 historical coordinate points |
| ML explanation | Current model run stores grouped feature-importance categories and evaluation context |
| TypeScript | `tsc --noEmit` passed |
| Worker production build | Passed |
| Security advisor | No public-table security errors; four INFO notices are deliberately default-denied private tables; Auth leaked-password warning is not used by the no-login frontend |
| Performance advisor | INFO-only unused-index notices; new/FK indexes retained |
| GitHub/Cloudflare release | Passed: workflow run `36755097264` completed tests, Turnstile setup, build, deploy and health check for commit `ae67fc2` |
| Production route smoke | Passed for the public dashboard, form, map and health endpoint |
| Production write | Passed: clearly labelled form submission reached `submitted_venues` as `pending` and was moderated |
| Production cleanup | Passed: exact demonstration UUID `1e85f203-bb7e-44ac-b921-4a9e9a257ac9` deleted; zero matching rows remain |

Rollback-scoped fixtures never remain in production and are never presented as historical data. Public approval visibility is covered by the database acceptance test; the real production form proved the browser-to-Worker-to-Supabase write path. The clearly labelled production demonstration row was removed after moderation. Historical counts and model data remained unchanged.

Advisor references: [private tables without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
