# Public venue submissions

The dashboard and submission/report forms require no sign-in. `/add-venue` sends a whitelisted payload through the same-origin Worker after Cloudflare Turnstile verification. Name, source region, locality and 1–15 known activities are required. Address, description and paired coordinates are optional. Telephone/contact, ratings, review counts, moderation fields and provenance are not collected from the visitor.

## Moderation and provenance

Every new row starts with immutable provenance `source_type=user_submitted`, `source_dataset=public_venue_submissions`, `is_synthetic=false` and `verification_status=pending`. Pending and rejected rows are hidden by RLS. Only records changed to `approved` by the database owner appear at `/submitted-venues`, where they are visibly labelled as user-submitted community data.

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
- The final live form submission, approval visibility and cleanup are tracked in `test-results.md`.
