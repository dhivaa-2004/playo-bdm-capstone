# Current status

Updated 2 October 2026. The historical audit, ETL, normalized Supabase database, SQL EDA, feature store, grouped ML experiment, prediction write-back, public dashboard, evidence comparison, SQL/data lineage, model and quality diagnostics, clustered venue map, moderated community workflow, correction reports and independent Cloudflare deployment are implemented. Approved community venues are included in Venue Explorer, venue details and saved comparisons after moderation; Activities & Services reports historical, approved-community and total discovery counts separately. The empirical dataset remains 3,697 exact-deduplicated historical records, with zero synthetic records.

## Production architecture

- Source: <https://github.com/dhivaa-2004/playo-bdm-capstone>
- Hosting: <https://playo-venue-observatory.dhivaa2004.workers.dev>
- Database: Supabase project `qztngersjtzropfjbcnl`
- Release: GitHub Actions tests, builds and deploys `main` to Cloudflare Workers
- Access: public dashboard with no application sign-in

## Implemented community workflow

Public venue submissions use Turnstile, server and database validation, normalized duplicate warnings, restricted column grants and RLS. Every new record starts `pending`; only records manually changed to `approved` in Supabase are publicly readable. Approved rows appear in both the community directory and the unified Venue Explorer with explicit community labels, and can be compared without fabricated rating evidence. Pending and rejected rows remain hidden. Visitors can submit correction/duplicate reports but cannot directly edit or delete venues. Community data remains separate from historical analysis and ML.

## Implemented analytical additions

The venue map displays all 3,697 historical coordinates with region filtering and client-side clustering at lower zoom; coordinate-less records would remain available through the normal explorer. The comparison view supports two-to-four source regions and up to four browser-saved venues. The lineage view traces archive and training hashes, normalized tables, safe SQL examples and the stored model run. Quality drill-down and model diagnostics calculate their explanation text from the returned evidence, so the wording changes when the result changes rather than repeating a single generic template.

Visual context remains deliberately lightweight: three original WebP photographs provide prominent context on the activity, source-region and community workflows, while the lineage workflow keeps a compact SVG process guide. The photographs are visibly labelled as illustrative, stay below 150 KB each, use fixed dimensions and load immediately because they sit above the fold; the diagram remains lazy-loaded. The overview photographs are also served as resized WebP files. Data-heavy pages that already contain maps, charts or tables do not receive unnecessary decorative images.

## Security and observability

Public writes do not use a service-role key. Turnstile is verified server-side. Database triggers enforce valid activities, field rules and caps, automatically stamp moderation time, and require notes for rejection. Pending and rejected rows stay hidden through public RLS. Unified discovery and activity-directory responses use `no-store` so moderation changes are visible immediately. The Worker adds CSP, HSTS, referrer, permissions, content-type, frame and opener policies. Stable aggregate responses have ETags and bounded cache policies. Cloudflare structured logs record safe request/error metadata. Daily route checks, post-deployment Chromium/Axe tests and CodeQL are configured.

## Verification state

Python/frontend tests, TypeScript, lint with zero errors, production build, CodeQL, post-deployment Playwright/Axe checks and rollback-scoped database acceptance pass for the 2 October release. The discovery acceptance test proves pending/approved/rejected visibility, source/region/activity/rating filters, pagination, activity-count arithmetic and unchanged historical/model invariants. The live site reports 3,697 historical and zero currently approved community venues; no demonstration row remains. Manual inspection confirmed the unified Venue Explorer, corrected Activities & Services table and atomic light/dark switching. Exact commit and workflow evidence are recorded in `docs/test-results.md`.
