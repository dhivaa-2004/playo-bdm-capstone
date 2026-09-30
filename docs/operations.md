# Operations

The production site has no application sign-in. The database owner moderates community records in the Supabase Table Editor; no admin credentials or service-role key are exposed to the Worker.

## Moderate a venue

1. Open Supabase → Table Editor → `submitted_venues`.
2. Review rows where `verification_status = 'pending'`.
3. Check the venue claim and possible normalized-name/region/locality duplicates.
4. Set `verification_status` to `approved` to publish it, or `rejected` to keep it private.
5. Approved records appear under `/submitted-venues` after refresh. They remain separate from historical KPIs, feature store and ML.

## Review correction reports

Open `venue_correction_reports`. Resolve the referenced historical or submitted venue using the supplied reason/details. The public can report a problem but cannot edit or delete a venue. Remove reports only after the issue has been handled according to the project's retention needs.

## Verification and deployment

Run Python tests, frontend validation tests, TypeScript and the production build before release. GitHub Actions performs the same checks and deploys from `main`. The production smoke workflow monitors public routes and the health endpoint. Preserve returned errors; never report a zero-row update as success.

## Recovery and secrets

Apply additive migrations and preserve historical rows, lineage, model runs and predictions. Keep `.env` files, raw archives, Cloudflare tokens, Turnstile secrets, database passwords and service-role keys out of Git. Rotate a secret through its provider and GitHub/Cloudflare secret settings; never paste it into documentation.

## API boundary

GET handlers whitelist operations and validate query parameters. Public writes whitelist fields, verify same-origin context and Turnstile, and rely on column grants, RLS and validation/rate-limit triggers. Duplicate warnings compare normalized venue name, region and locality. Arbitrary SQL, owner IDs, provenance, moderation status and timestamps are never accepted from the browser. Raw HTML and phone data are absent from the public API.
