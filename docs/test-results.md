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
| GitHub/Cloudflare release | Pending verification of the latest pushed revision |
| Production route smoke | Pending verification of the latest deployment |
| Complete production write flow | Pending: Turnstile form → pending Supabase row → approval/public visibility → exact cleanup |

Rollback-scoped fixtures never remain in production and are never presented as historical data. The complete production write test uses a clearly labelled temporary community row and removes it after approval visibility is confirmed. Historical counts and model data must remain unchanged.

Advisor references: [private tables without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
