# Independent Cloudflare deployment

Production runs as a standalone Cloudflare Worker at <https://playo-venue-observatory.dhivaa2004.workers.dev>. Supabase remains the PostgreSQL database. The application does not depend on ChatGPT hosting or a ChatGPT session.

## Automated release

GitHub `main` is the source of truth. `.github/workflows/deploy-cloudflare.yml` performs this release sequence:

1. install the pinned pnpm/Node toolchain and dependencies;
2. run frontend tests, TypeScript and the production build;
3. create or reuse the `playo-venue-submissions` Turnstile widget;
4. store Turnstile site/secret keys as Worker secrets;
5. deploy the generated Worker with existing runtime variables preserved;
6. check the production health endpoint.

The GitHub repository needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. The Worker needs `SUPABASE_PUBLISHABLE_KEY`; the project URL is non-secret configuration. Never store a service-role key, database password or token in source.

`production-smoke.yml` also checks the home page, form, map and health endpoint daily and can be run manually.

## Runtime and security

The public frontend has no sign-in. Turnstile is verified server-side before a public submission or correction report is written. Column-limited grants, RLS and database triggers remain the final data boundary. Cloudflare structured logs record route, request ID, status and safe error classification without venue text or credentials.

## Acceptance checklist

- Dashboard opens without sign-in and displays 3,697 historical venues, 3,186 rated and 511 unrated.
- Sidebar routes open, including Venue map and ML explanation.
- A clearly labelled temporary venue passes Turnstile and is stored as `pending`.
- Pending rows are absent from Submitted venues; changing the row to `approved` in Supabase makes it public.
- A correction report can be submitted without granting public edit access.
- The temporary venue/report are removed after the test.
- Historical counts, the model run and predictions remain unchanged.

Free hosting remains subject to Cloudflare and Supabase plan limits. No paid upgrade is required for the current capstone workload.

Sources: <https://developers.cloudflare.com/workers/ci-cd/builds/>, <https://developers.cloudflare.com/workers/observability/logs/>, <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>.
