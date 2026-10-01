# Numbered private project archive

The downloadable handoff package follows the real system sequence. Folder numbers are part of the names so a teammate can read the project from top to bottom.

| Order | Folder | Purpose |
|---:|---|---|
| 01 | `01_START_HERE` | Read-first overview, exact data flow, folder index and project links |
| 02 | `02_ORIGINAL_INPUTS_AND_REFERENCES` | User-supplied plan, course references, chat/prompt exports, reference deck and safe/redacted setup screenshots |
| 03 | `03_RAW_HISTORICAL_DATA_PRIVATE` | Untouched `playo-find-venue-master.zip`, SHA-256 and inventory |
| 04 | `04_RAW_DATA_AUDIT_AND_TRANSFORMATION` | Audit report, audit evidence, transformation code, validation and unit tests |
| 05 | `05_STRUCTURED_DATA_AND_SUPABASE` | Sanitized relational payload, load SQL, database migrations, ER diagram and live database verification |
| 06 | `06_SQL_EDA_AND_FEATURE_STORE` | SQL analysis, dashboard functions, feature-store design and SQL concept mapping |
| 07 | `07_MACHINE_LEARNING_AND_PREDICTIONS` | Training code, evaluation protocol, aggregate results and prediction write-back explanation |
| 08 | `08_WEB_APPLICATION_SOURCE` | React/TypeScript application, server API, form validation, Turnstile and frontend images |
| 09 | `09_GITHUB_TO_CLOUDFLARE_DEPLOYMENT` | GitHub Actions, Worker configuration, health monitor and deployment guide |
| 10 | `10_IMAGES_AND_ER_DIAGRAM` | Verified production screenshots, ER diagram and redacted setup screenshots |
| 11 | `11_PRESENTATION_AND_TEAM_GUIDE` | Final Arial presentation and Word/PDF teammate guide |
| 12 | `12_TESTS_SECURITY_AND_OPERATIONS` | Tests, production evidence, security rules, operations and status |
| 13 | `13_COMPLETE_GITHUB_SOURCE` | Snapshot of every Git-tracked repository file at package creation time |
| 98 | `98_SECURITY_AND_EXCLUSIONS.md` | Explicit list of excluded credentials and sensitive files |
| 99 | `99_FILE_CHECKSUMS.sha256` | SHA-256 checksum for every packaged file |

## Correct interconnection model

GitHub does **not** supply venue records to the website. GitHub stores the source code. GitHub Actions tests and deploys that code to Cloudflare Workers. At runtime the Worker API calls Supabase REST/RPC endpoints with a publishable key, and Supabase RLS controls what can be read or inserted.

```text
Historical ZIP → Python ETL → structured PostgreSQL/Supabase
                                    ↑             ↓
GitHub source → GitHub Actions → Cloudflare Worker → public dashboard
```

The original ZIP and row-level structured derivative are included only in the private handoff package. They remain excluded from the public GitHub repository because independent redistribution rights were not established and the original HTML contains contact information.

## Rebuild command

```sh
python scripts/build_handoff_package.py \
  --uploads /path/to/upload \
  --output /path/to/Playo_BDM_Complete_Project_Package_2026-10-01
```

The script fails if the target folder already exists. This prevents silent overwriting of an earlier handoff.
