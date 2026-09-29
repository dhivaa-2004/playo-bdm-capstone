# Playo BDM Capstone

Historical third-party Playo-related data audit and an early offline ingestion foundation for MBA Business Data Management (23BA044E).

**In progress: not a completed or deployed application.**

See [the complete audit and proposal](docs/historical-data-audit.md) and [current status](docs/status.md). The historical export has 3,701 raw rows, 3,697 candidates after exact deduplication, and 3,186 rated candidates. No synthetic expansion has been generated. Current Playo pages were reviewed only as domain/schema references; no collection job is enabled.

## Reproduce the audit

Python 3.10+; standard library only. Supply your local copy of the archive; raw data and contact details are not bundled.

```sh
python scripts/audit_historical.py /path/to/playo-find-venue-master.zip --output audit/historical
python -m unittest discover -s tests -v
```

The audit never runs archive scripts. It exports aggregate metrics and row locators. SHA-256 hashes identify the input and its members. `audit/historical/audit.json` is the checked output for the supplied archive.

`pipeline/` is an earlier generic JSONL ingestion prototype, not yet adapted to `third_party_historical`. Architecture and feature plans are provisional. Latest audit decisions supersede older acquisition assumptions.

Planned flow: immutable historical source → Python cleaning → Supabase PostgreSQL → SQL EDA → feature views → ML → prediction write-back → authenticated live dashboard.

Keep secrets in deployment environment variables; `.env.example` contains placeholders only. Never commit `.env`, credentials, access tokens, database passwords or service-role keys. Auth/RLS implementation is pending before production data access.
