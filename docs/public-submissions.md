# Public venue submissions

The dashboard, historical explorer and submission form require no sign-in. The website's legacy auth endpoint returns 410 for login/signup attempts; no session is required for public use.

`/add-venue` writes to `public.submitted_venues` through a same-origin backend route using only the publishable key. Name, source region, locality and 1–15 known activities are required. Address, description and paired coordinates are optional. No telephone/contact, rating, review count or invented prediction field is collected.

`/submitted-venues` reads saved database rows, with name/region search and 20-row pagination. Every card visibly says User-submitted · Unverified. Historical Venue explorer links to this separate directory. `/data-management` and `/workspace` are aliases of the public form; `/admin` resolves to public data quality without revealing private records.

The database assigns immutable provenance: source_type=user_submitted, source_dataset=public_venue_submissions, is_synthetic=false, verification_status=unverified and a server submission timestamp. These are user claims, not verified real-world or current Playo records. Only genuine public venue information should be submitted; test fixtures must not be left in production.

RLS permits public reads and insert of only the eight editable form columns. Anonymous and ordinary authenticated clients cannot update/delete records, forge provenance, set timestamps or modify historical data. A unique normalized name/region/locality index prevents exact repeat submissions. A serialized database trigger validates activity membership and caps submissions at 200 per UTC day and 10,000 total. These are small-project storage safeguards, not comprehensive bot protection. An open form can still receive inaccurate entries. The database owner can correct/remove an entry using Supabase; unrestricted anonymous edit/delete is intentionally absent.

New rows are available after save/refresh. This does not claim WebSocket push, automatic ML scoring or automatic retraining. All primary SQL KPIs, the feature store, evaluation splits and stored predictions remain historical-only because the new table is separate and not referenced by those queries.

## Verification on 30 September 2026

- Five frontend input-validation tests pass.
- Anonymous insertion with server-assigned provenance passes in a rolled-back transaction.
- Anonymous update/delete, forged provenance, invalid activities and historical insertion are rejected.
- TypeScript and standalone production build pass; Wrangler deploy dry-run passes.
- Supabase advisor reports no new table/RLS warnings. Existing private default-deny tables are informational. Supabase Auth has an existing leaked-password protection warning; this frontend no longer uses password authentication.
- Browser checks and independent-host live acceptance are documented in current status, not inferred from SQL tests.
