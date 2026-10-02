# Public venue submissions

The dashboard and submission/report forms require no sign-in. `/add-venue` sends a whitelisted payload through the same-origin Worker after Cloudflare Turnstile verification. Name, source region, locality and 1–15 known activities are required. Address, description and paired coordinates are optional. Telephone/contact, ratings, review counts, moderation fields and provenance are not collected from the visitor.

## Moderation and provenance

Every new row starts with immutable provenance `source_type=user_submitted`, `source_dataset=public_venue_submissions`, `is_synthetic=false` and `verification_status=pending`. Pending and rejected rows are hidden by RLS. Only records changed to `approved` by the database owner appear at `/submitted-venues` and in `/venues`, where they are labelled as community data. The explorer searches both sources by default and offers a source filter. Region and activity filters cover both sources; positive minimum-rating or rating-count filters exclude community submissions because those values are not collected.

Community rows never enter the historical feature store, KPIs, evaluation splits, model training or predictions. Approval means accepted for public display, not independently verified current Playo data.

## Abuse and quality controls

- Turnstile is validated server-side; tokens are single-use and time-limited by Cloudflare.
- The form warns when normalized venue name + region + locality resembles an existing submission.
- The database prevents the exact normalized triple, validates activities and applies submission caps.
- Column grants and RLS allow only the public form columns to be inserted. Public update/delete is denied.
- `/report` accepts correction/duplicate reports for a historical or submitted venue while giving visitors no edit access.
- Cloudflare logs record structured failures without storing venue text in log messages.

## Verification on 30 September 2026

- Seven frontend validation tests pass.
- Rollback-scoped database acceptance proves pending rows are hidden, approved rows are visible and correction reports save.
- Forged provenance/status, public update/delete and historical modification remain unavailable.
- The map RPC returns all 3,697 historical coordinate records and the current model run contains the explanation payload.
- TypeScript and the standalone production build pass.
- A clearly labelled production form submission reached Supabase as `pending` and was moderated.
- The exact demonstration UUID was deleted after testing; no matching test row remains.
- Public approval visibility is additionally proven by the rollback-scoped RLS acceptance test in `test-results.md`.

## Unified discovery (2 October 2026)

- `venue_catalog` is a security-invoker view combining historical records with explicitly approved community rows. Underlying RLS remains active; pending/rejected rows and moderation notes are excluded.
- `venue_catalog_search` returns filtered total, historical and community counts with deterministic pagination. The historical-only search RPCs and analytical tables remain intact.
- Community detail pages display submitted locality, address, description and activities, and support comparison and correction reports. They carry no fabricated ratings or predictions.
- `activity_directory` shows historical membership count, approved community membership count and their sum. Historical rated/unrated counts and mean rating retain their original denominator. One venue can contribute to several activity rows.
- Discovery endpoints use `Cache-Control: no-store`; reload or Refresh live data reads current approval status. The page does not subscribe to real-time moderation events.
- Owner-run `sql/tests/004_unified_venue_discovery.sql` passed against Supabase with rollback-only fixtures: pending visibility, approval, rejection, source/region/activity/rating filters, pagination, activity arithmetic and historical/model invariants.
- Browser tests cover deployed API consistency and fixture-based community navigation/comparison without inserting production submissions.
