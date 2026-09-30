# Current status

Updated 30 September 2026. The historical audit, ETL, normalized Supabase database, SQL EDA, feature store, grouped ML experiment, prediction write-back, public dashboard, venue map, moderated community workflow, correction reports and independent Cloudflare deployment are implemented. The empirical dataset remains 3,697 exact-deduplicated historical records, with zero synthetic records.

## Production architecture

- Source: <https://github.com/dhivaa-2004/playo-bdm-capstone>
- Hosting: <https://playo-venue-observatory.dhivaa2004.workers.dev>
- Database: Supabase project `qztngersjtzropfjbcnl`
- Release: GitHub Actions tests, builds and deploys `main` to Cloudflare Workers
- Access: public dashboard with no application sign-in

## Implemented community workflow

Public venue submissions use Turnstile, server and database validation, normalized duplicate warnings, restricted column grants and RLS. Every new record starts `pending`; only records manually changed to `approved` in Supabase are publicly readable. Visitors can submit correction/duplicate reports but cannot directly edit or delete venues. Community data remains separate from historical analysis and ML.

## Implemented analytical additions

The venue map displays all 3,697 historical coordinates with region filtering; coordinate-less records would remain available through the normal explorer. The ML explanation page shows baselines, held-out MAE/RMSE/R², grouped evaluation, feature-importance categories and an explicit non-causal estimate warning.

## Security and observability

Public writes do not use a service-role key. Turnstile is verified server-side. Database triggers enforce valid activities, field rules and caps, including pending rows hidden from public RLS. Cloudflare structured logs record safe request/error metadata. A scheduled production smoke workflow checks the public home, form, map and health routes.

## Verification state

Frontend tests, TypeScript, production build, GitHub Actions deployment, production route smoke checks and rollback-scoped database acceptance pass. Database acceptance proves pending visibility rules, approval visibility, correction-report writes, map output and model-explanation storage, then rolls fixtures back. A clearly labelled production form submission reached Supabase as `pending`, was moderated, and its exact UUID was deleted after testing. No demonstration row remains. Final team presentation and screenshot-led guide are available in `deliverables/`.
