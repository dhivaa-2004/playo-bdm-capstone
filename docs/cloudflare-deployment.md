# Independent Cloudflare deployment

The updated frontend runs as a standalone Cloudflare Worker. Supabase remains the database. No ChatGPT session, hosting account, connector or Sites build service is required. The existing hosted version is a separate older deployment until cutover.

## Connect the existing repository

In your own Cloudflare account, open Workers & Pages → Create application → Import a repository. Choose `dhivaa-2004/playo-bdm-capstone` and configure:

| Setting | Value |
|---|---|
| Worker name | `playo-venue-observatory` |
| Production branch | `main` |
| Root directory | `frontend` |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy` |
| Node version build variable | `NODE_VERSION=24.19.0` |
| pnpm version build variable | `PNPM_VERSION=11.25.0` |

The committed packageManager and lockfile pin pnpm/dependencies. The build service normally installs dependencies automatically. If using a custom install command, use `pnpm install --frozen-lockfile`.

The generated Worker configuration is `dist/server/wrangler.json`. `pnpm run deploy` uses that generated file, not the unbuilt source configuration. The source Worker name must match the dashboard name.

## Runtime configuration

`SUPABASE_URL` is already set in wrangler.jsonc to the existing project URL.

Add `SUPABASE_PUBLISHABLE_KEY` as a Worker runtime **secret**, using the publishable key from the existing Supabase project Settings → API Keys. Do not use the service-role key, database password or an account access token. No actual key belongs in GitHub. Build variables alone are not runtime bindings.

Deploy/redeploy after adding the runtime binding. Open the exact workers.dev URL Cloudflare returns. No custom domain purchase is needed. GitHub pushes to main should trigger subsequent builds once connected.

## Acceptance after deploy

1. Open the URL in a private browser window. Dashboard opens without sign-in.
2. Confirm historical counts: 3,697 venues, 3,186 rated, 511 unrated.
3. Open each navigation destination. Search/filter/page the historical explorer.
4. Add a genuine public venue using the new form. Record its returned UUID.
5. Refresh Submitted venues and confirm that UUID in Supabase `public.submitted_venues`. The row must be user_submitted, unverified and non-synthetic.
6. Confirm historical counts and the stored ML run have not changed.
7. Check Cloudflare logs and free-plan usage. Only after this succeeds, retire the old hosting through its normal reversible unpublish controls.

The application no longer performs sign-in, so Supabase Auth redirect URLs are not used by this frontend. Existing private workspace records and admin membership remain protected in Supabase; the public app cannot read or alter them.

## Free-plan scope and current blocker

Cloudflare Workers Free currently allows 100,000 requests/day across the account and 10 ms CPU/request. Supabase has its own quotas and inactivity policies. Free hosting is subject to these limits, not an unlimited guarantee. No paid upgrade is requested. The production bundle passed Wrangler dry-run (about 274 KiB gzipped); production CPU and full live behaviour must be verified after the account deployment.

On 30 September 2026 Cloudflare's dashboard repeatedly presented a security-verification page to the agent browser. No Cloudflare deployment or GitHub build connection was completed by the agent. The user must complete the account connection; no credentials should be pasted into chat.

Sources: https://developers.cloudflare.com/workers/ci-cd/builds/ and https://developers.cloudflare.com/workers/platform/limits/ .
