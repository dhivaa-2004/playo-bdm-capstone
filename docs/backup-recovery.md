# Backup and recovery runbook

The project has two independent assets: versioned application/schema source in GitHub and production rows in Supabase. A Git clone is not a database backup, and a database dump is not a replacement for Git history.

## What is already recoverable

- GitHub stores application source, SQL migrations, aggregate audit evidence, tests and deployment workflows.
- The original raw archive remains private and unchanged outside the public repository.
- Supabase stores normalized historical rows, lineage, model runs, predictions and moderated community data.
- Hashes in `private.ingestion_runs`, `private.raw_lineage` and `model_runs` detect mismatched inputs or experiments.

## Before a schema or bulk-data change

1. Confirm the exact Supabase project reference: `qztngersjtzropfjbcnl`.
2. Commit the additive migration and a rollback-scoped acceptance test.
3. Export a database backup using a database-owner connection stored only in a secure local environment:

   ```sh
   pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file playo-capstone-$(date +%F).dump
   pg_dump "$DATABASE_URL" --schema-only --no-owner --no-acl --file playo-capstone-schema-$(date +%F).sql
   ```

4. Store the dump in approved private storage, never in this public repository.
5. Apply the migration once, run SQL acceptance in a transaction and recheck the 3,697 historical count.

## Recovery rehearsal

Restore into a separate empty PostgreSQL/Supabase test project—never over production:

```sh
createdb playo_restore_test
pg_restore --clean --if-exists --no-owner --no-acl --dbname playo_restore_test playo-capstone-YYYY-MM-DD.dump
```

Verify the schema, 3,697 historical venues, 3,186 rated records, 511 unrated records, model run/prediction counts and RLS before considering the backup usable. Delete the isolated rehearsal database afterward according to the storage policy.

## Incident order

1. Stop new deployments; do not delete existing tables.
2. Preserve logs, the failing commit SHA and current database state.
3. If only application code failed, redeploy the last known good GitHub commit.
4. If an additive migration failed, correct it with a new forward migration; do not rewrite applied history.
5. Restore a database dump only into a separate project first, validate it, then plan the production cutover.
