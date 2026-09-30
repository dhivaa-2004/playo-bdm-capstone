# Playo frontend

Standalone Cloudflare Workers application with Supabase database reads and public venue submissions. No sign-in or ChatGPT hosting dependency.

Use Node 24 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, `pnpm run typecheck`, `pnpm test`, and `pnpm run build`. Deploy with `pnpm run deploy`.

See [deployment instructions](../docs/cloudflare-deployment.md) and [public submission design](../docs/public-submissions.md). Copy `.env.example` to ignored `.dev.vars` for local development. The publishable key is a runtime binding, not a committed credential.

Some unused starter utility files are retained for history. The active entrypoints are `vite.config.ts`, `wrangler.jsonc` and `worker.ts`; they do not load the Sites utilities.
