"""Build the private, numbered Playo BDM handoff package.

The output intentionally contains the user-supplied raw archive and therefore must not
be committed to the public repository. Secrets, local environment files, Git metadata,
dependencies, caches and the unredacted Cloudflare-token screenshot are excluded.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOKEN_SCREENSHOT = "4b8db08a-386b-4152-978e-2b011022581c.png"


def copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def tracked_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, check=True, capture_output=True
    )
    return [Path(item.decode()) for item in result.stdout.split(b"\0") if item]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build_structured_output(raw_zip: Path, output: Path) -> dict:
    sys.path.insert(0, str(ROOT))
    from pipeline.historical import canonical, prepare, sql_literal

    payload = prepare(raw_zip)
    output.mkdir(parents=True, exist_ok=True)
    write(output / "01_structured_payload.json", canonical(payload))
    quality = {key: value for key, value in payload.items() if key != "venues"}
    write(output / "02_quality_and_provenance.json", json.dumps(quality, indent=2))
    load_sql = (
        "-- PRIVATE structured load artifact. Do not replay on the existing project.\n"
        "BEGIN;\nSELECT private.load_historical("
        + sql_literal(canonical(payload))
        + "::jsonb);\nCOMMIT;\nSELECT * FROM public.dataset_status;"
    )
    write(output / "03_load_historical_PRIVATE.sql", load_sql)
    return payload


def redact_token_image(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "convert", str(source),
        "-fill", "#111111", "-draw", "rectangle 485,335 1775,420",
        "-fill", "white", "-pointsize", "30", "-draw", "text 650,385 '[REDACTED CLOUDFLARE TOKEN]'",
        "-fill", "#111111", "-draw", "rectangle 485,548 1775,635",
        "-fill", "white", "-pointsize", "25", "-draw", "text 650,600 '[REDACTED AUTHORIZATION HEADER]'",
        str(destination),
    ]
    subprocess.run(command, check=True)
    # Some container filesystems expose image writes a moment before all metadata is stable.
    # Wait briefly, then force a complete read before producing package checksums.
    time.sleep(1)
    destination.read_bytes()


def zip_folder(folder: Path) -> Path:
    archive = folder.with_suffix(".zip")
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for file in sorted(p for p in folder.rglob("*") if p.is_file()):
            z.write(file, file.relative_to(folder.parent))
    return archive


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uploads", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    uploads = args.uploads.resolve()
    package = args.output.resolve()
    if package.exists() or package.with_suffix(".zip").exists():
        raise SystemExit(f"Refusing to overwrite existing package: {package}")
    package.mkdir(parents=True)

    start = package / "01_START_HERE"
    write(start / "01_READ_ME_FIRST.md", """# Playo BDM complete project package

Read the numbered folders in order. This package contains private raw data and must not be uploaded publicly. The public GitHub repository contains code and non-sensitive aggregate evidence only.

The central distinction is: historical rows support the empirical analysis; user-submitted rows are moderated community claims; zero synthetic historical rows are loaded.
""")
    write(start / "02_PROJECT_FLOW.md", """# End-to-end project flow

1. The untouched historical ZIP is hashed and inventoried.
2. Python audits 3,701 raw rows without running code inside the archive.
3. Four exact duplicate extras are removed, producing 3,697 historical candidate rows.
4. HTML, phones, links, icons and the truncated rating field are excluded from the structured output.
5. Names, coordinates, regions, ratings and activity/service labels are normalized into relational tables with provenance and lineage.
6. Supabase PostgreSQL stores the structured data, SQL views, RPCs, RLS policies, model runs and predictions.
7. SQL creates EDA aggregates and `feature_store_v1`.
8. Python compares baselines with grouped regression and writes versioned predictions back to PostgreSQL.
9. GitHub stores code. GitHub Actions tests and deploys it to Cloudflare Workers.
10. The Cloudflare Worker reads live data from Supabase REST/RPC endpoints; GitHub is not the runtime database.
11. The dashboard exposes historical evidence, a map, ML explanation and a separately moderated community-submission path.
""")
    write(start / "03_PROJECT_LINKS.txt", """GitHub: https://github.com/dhivaa-2004/playo-bdm-capstone
Production: https://playo-venue-observatory.dhivaa2004.workers.dev
Supabase project reference: qztngersjtzropfjbcnl
Source snapshot: every Git-tracked file present when this package was built (folder 13)
""")
    copy(ROOT / "docs/archive-structure.md", start / "04_FOLDER_INDEX.md")

    original = package / "02_ORIGINAL_INPUTS_AND_REFERENCES"
    mappings = [
        ("Playo_BDM_Capstone_Full_Execution_Plan.md", "01_Capstone_Full_Execution_Plan.md"),
        ("23BA044E-Business Data Management.pdf", "02_Business_Data_Management_Course_Reference.pdf"),
        ("PostgreSQL-CheatSheet(2).docx", "03_PostgreSQL_Cheat_Sheet.docx"),
        ("06212b03-a830-4c9a-9745-49e1614b8a7e.pptx", "04_Friend_Presentation_REFERENCE_ONLY.pptx"),
        ("BDM2026-main.zip", "05_Original_BDM2026_Project_Files.zip"),
        ("Pasted markdown(4).md", "06_Original_Requirements_And_Chat.md"),
        ("Pasted text (2).txt", "07_Original_Text_Reference_1.txt"),
        ("Pasted text(2).txt", "08_Original_Text_Reference_2.txt"),
        ("Pasted text(3).txt", "09_Original_Text_Reference_3.txt"),
    ]
    for source, name in mappings:
        if (uploads / source).exists():
            copy(uploads / source, original / name)

    raw_zip = uploads / "playo-find-venue-master.zip"
    raw = package / "03_RAW_HISTORICAL_DATA_PRIVATE"
    copy(raw_zip, raw / "01_playo-find-venue-master_UNCHANGED.zip")
    inventory = subprocess.run(
        ["unzip", "-l", str(raw_zip)], check=True, capture_output=True, text=True
    ).stdout
    write(raw / "02_RAW_ARCHIVE_SHA256.txt", f"{sha256(raw_zip)}  playo-find-venue-master.zip")
    write(raw / "03_RAW_ARCHIVE_INVENTORY.txt", inventory)
    write(raw / "04_RAW_DATA_README.md", """# Raw historical archive

This ZIP is copied byte-for-byte from the supplied upload. It contains four city JSON datasets and original project files. It was never executed or modified. Its source observation date is unknown, its HTML contains contact information, and independent redistribution rights were not established. Keep this folder private.
""")

    audit = package / "04_RAW_DATA_AUDIT_AND_TRANSFORMATION"
    for source, name in [
        (ROOT / "docs/historical-data-audit.md", "01_Historical_Data_Audit.md"),
        (ROOT.parent / "Playo_Historical_Data_Audit.pdf", "02_Historical_Data_Audit.pdf"),
        (ROOT / "docs/data-acquisition.md", "03_Data_Acquisition_And_Provenance.md"),
        (ROOT / "docs/input-contract.md", "04_Input_Contract.md"),
        (ROOT / "docs/source-inventory.md", "05_Source_Inventory.md"),
        (ROOT / "pipeline/historical.py", "06_Historical_ETL.py"),
        (ROOT / "scripts/audit_historical.py", "07_Read_Only_Audit.py"),
        (ROOT / "tests/test_historical.py", "08_Historical_ETL_Tests.py"),
        (ROOT / "audit/historical/audit.json", "09_Aggregate_Audit_Evidence.json"),
    ]:
        if source.exists(): copy(source, audit / name)
    write(audit / "10_WHAT_WAS_DONE_TO_RAW_DATA.md", """# What was done to the raw data

1. Calculated the archive and member SHA-256 hashes.
2. Read only the four `venues_<region>.json` files; no script in the archive was run.
3. Validated latitude, longitude, average rating, rating count and activity-list rules.
4. Treated `avgRating=0` with `ratingCount=0` as missing/unrated, never as a zero-star score.
5. Removed four exact duplicate extras using canonical-record hashes.
6. Removed repeated activity memberships within a venue.
7. Built stable UUIDs from provider IDs, with deterministic fallbacks for three missing IDs.
8. Created conservative entity groups from same-region normalized names or exact coordinates.
9. Removed raw HTML, phone/contact content, URLs, icons and truncated `rating` from structured records.
10. Preserved raw-row lineage using archive, member and record hashes.
11. Retained explicit provenance: `third_party_historical`, `is_synthetic=false`, `playo-find-venue-master`.
12. Produced 3,697 structured historical candidates: 3,186 rated and 511 unrated.
""")

    structured = package / "05_STRUCTURED_DATA_AND_SUPABASE"
    payload = build_structured_output(raw_zip, structured / "04_PRIVATE_STRUCTURED_LOAD_ARTIFACT")
    for source, name in [
        (ROOT / "docs/database-design.md", "01_Database_Design.md"),
        (ROOT / "docs/assets/er-diagram.png", "02_Entity_Relationship_Diagram.png"),
    ]: copy(source, structured / name)
    for migration in sorted((ROOT / "sql/migrations").glob("*.sql")):
        copy(migration, structured / "03_BASE_DATABASE_MIGRATIONS" / migration.name)
    for migration in sorted((ROOT / "supabase/migrations").glob("*.sql")):
        copy(migration, structured / "05_ADDITIVE_SUPABASE_MIGRATIONS" / migration.name)
    write(structured / "06_LIVE_SUPABASE_VERIFICATION_2026-10-01.md", """# Live Supabase verification — 1 October 2026

- Project: `dhivaa-2004's Capstone` (`qztngersjtzropfjbcnl`), status `ACTIVE_HEALTHY`
- PostgreSQL: 17.6, region `ap-southeast-1`
- Historical venues: 3,697
- Rated / unrated: 3,186 / 511
- Activity/service labels: 89
- Source regions: 4
- Predictions: 3,697
- Synthetic historical rows: 0
- Pending / approved community rows: 0 / 0
- RLS: enabled on every listed public table
- Security advisor: four INFO notices are default-denied private lineage/import tables; leaked-password protection warning is irrelevant to the no-sign-in frontend
- Performance advisor: three INFO-only unused-index notices retained for future/FK access patterns

The canonical executable schema is the ordered migration set in this folder. The row-level payload and load SQL are private reproducibility artifacts and must not be replayed on the already-loaded production project.
""")
    assert payload["quality"] == {
        "raw_rows": 3701, "accepted_rows": 3697, "duplicate_rows": 4,
        "rejected_rows": 0, "rated_rows": 3186, "unrated_rows": 511,
        "repeated_memberships_removed": 3, "label_count": 89,
        "entity_groups": 3667, "missing_provider_ids": 3,
    }

    sql_folder = package / "06_SQL_EDA_AND_FEATURE_STORE"
    copy(ROOT / "sql/eda/01_historical_analysis.sql", sql_folder / "01_Historical_SQL_EDA.sql")
    copy(ROOT / "docs/feature-store-and-evaluation.md", sql_folder / "02_Feature_Store_And_Evaluation.md")
    copy(ROOT / "docs/sql-concept-mapping.md", sql_folder / "03_SQL_Concept_Mapping.md")
    copy(ROOT / "sql/tests/001_access_and_integrity.sql", sql_folder / "04_Access_And_Integrity_Tests.sql")
    copy(ROOT / "sql/tests/002_public_submissions.sql", sql_folder / "05_Public_Submission_Tests.sql")

    ml = package / "07_MACHINE_LEARNING_AND_PREDICTIONS"
    copy(ROOT / "ml/train.py", ml / "01_Grouped_Rating_Model.py")
    copy(ROOT / "docs/ml-methodology.md", ml / "02_ML_Methodology.md")
    copy(ROOT / "audit/historical/model-evaluation.json", ml / "03_Model_Evaluation.json")
    write(ml / "04_RESULTS_README.md", """# Model result

`feature_store_v1` supplies region, coordinates and multi-hot activity indicators. The target is `avg_rating`; leakage fields are excluded. Entity-grouped splitting produced 2,547 training rows, 639 held-out rows and zero group overlap. The selected random forest achieved held-out MAE 0.4655, RMSE 0.6102 and R² 0.1633, versus median-baseline MAE 0.5169. All 3,697 versioned predictions are stored in Supabase, but only held-out rows support accuracy claims.
""")

    web = package / "08_WEB_APPLICATION_SOURCE"
    for file in tracked_files():
        if file.parts and file.parts[0] == "frontend":
            copy(ROOT / file, web / file.relative_to("frontend"))
    write(web / "00_WEB_DATA_FLOW.md", """# Web application data flow

The browser calls same-origin `/api/data`. The Cloudflare Worker validates the request and calls Supabase REST/RPC with the publishable key. Supabase grants and RLS return only permitted rows. Public submissions additionally require Turnstile and always enter as `pending`.
""")

    deploy = package / "09_GITHUB_TO_CLOUDFLARE_DEPLOYMENT"
    copy(ROOT / ".github/workflows/deploy-cloudflare.yml", deploy / "01_Deploy_Cloudflare_Worker.yml")
    copy(ROOT / ".github/workflows/production-smoke.yml", deploy / "02_Production_Health_Monitor.yml")
    copy(ROOT / "frontend/wrangler.jsonc", deploy / "03_Cloudflare_Worker_Config.jsonc")
    copy(ROOT / "frontend/app/api/data/route.ts", deploy / "04_Supabase_Data_API_Route.ts")
    copy(ROOT / "docs/cloudflare-deployment.md", deploy / "05_Deployment_Guide.md")
    write(deploy / "06_GITHUB_CLOUDFLARE_SUPABASE_EXPLAINED.md", """# How the services connect

- GitHub stores source code and documentation.
- A push that changes `frontend/**` triggers GitHub Actions.
- Actions installs pinned dependencies, tests, type-checks, builds, configures Turnstile secrets and deploys to Cloudflare Workers.
- Cloudflare hosts the public application and server API.
- The server API reads/writes permitted Supabase endpoints. Venue data never comes from GitHub at runtime.
- Supabase PostgreSQL is the database and RLS is the final access boundary.
""")

    images = package / "10_IMAGES_AND_ER_DIAGRAM"
    for i, source in enumerate(sorted((ROOT / "docs/assets").glob("*")), 1):
        copy(source, images / "01_VERIFIED_PRODUCTION_SCREENSHOTS" / f"{i:02d}_{source.name}")
    setup = images / "02_ORIGINAL_SETUP_SCREENSHOTS_REDACTED"
    safe_pngs = [p for p in sorted(uploads.glob("*.png")) if p.name != TOKEN_SCREENSHOT]
    for i, source in enumerate(safe_pngs, 1):
        copy(source, setup / f"{i:02d}_{source.name}")
    redact_token_image(uploads / TOKEN_SCREENSHOT, setup / "99_Cloudflare_Token_Screenshot_REDACTED.png")
    write(images / "03_IMAGE_INDEX.md", """# Image index

`01_VERIFIED_PRODUCTION_SCREENSHOTS` contains the final website screens used in the guide. `02_ORIGINAL_SETUP_SCREENSHOTS_REDACTED` preserves the supplied setup evidence; the Cloudflare token screenshot is redacted because the original displayed a secret. The ER diagram is included with the verified production images and in the database folder.
""")

    team = package / "11_PRESENTATION_AND_TEAM_GUIDE"
    for source in sorted((ROOT / "deliverables").glob("*")):
        copy(source, team / source.name)
    copy(ROOT / "docs/team-guide.md", team / "04_Quick_Teammate_Guide.md")

    verify = package / "12_TESTS_SECURITY_AND_OPERATIONS"
    for source, name in [
        (ROOT / "docs/test-results.md", "01_Test_Results.md"),
        (ROOT / "docs/status.md", "02_Current_Status.md"),
        (ROOT / "docs/operations.md", "03_Operations_And_Moderation.md"),
        (ROOT / "docs/public-submissions.md", "04_Public_Submissions_And_RLS.md"),
        (ROOT / "audit/historical/production-smoke.json", "05_Production_Smoke.json"),
        (ROOT / "audit/historical/security-results.txt", "06_Security_Results.txt"),
        (ROOT / "tests/test_ingest.py", "07_Ingestion_Tests.py"),
        (ROOT / "frontend/tests/venue-submission.test.mjs", "08_Frontend_Submission_Tests.mjs"),
    ]: copy(source, verify / name)

    complete = package / "13_COMPLETE_GITHUB_SOURCE" / "playo-bdm-capstone"
    for file in tracked_files():
        copy(ROOT / file, complete / file)

    write(package / "98_SECURITY_AND_EXCLUSIONS.md", """# Security and exclusions

Excluded from this package: `.env`, `.dev.vars`, service-role/secret keys, database passwords, Cloudflare API tokens, Turnstile secrets, Git metadata, `node_modules`, build output, caches and temporary chart-rendering files.

The original screenshot that visibly displayed a Cloudflare API token is not included. A redacted replacement is included instead. The publishable Supabase browser key is not a service-role secret, but runtime values are still not duplicated in this archive.

The raw historical ZIP and structured row-level payload are included because this is a private handoff requested by the owner. Do not publish them unless redistribution and privacy rights are confirmed.
""")

    checksums = []
    for file in sorted(p for p in package.rglob("*") if p.is_file()):
        checksums.append(f"{sha256(file)}  {file.relative_to(package)}")
    write(package / "99_FILE_CHECKSUMS.sha256", "\n".join(checksums))
    archive = zip_folder(package)
    print(json.dumps({"package": str(package), "zip": str(archive), "sha256": sha256(archive)}, indent=2))


if __name__ == "__main__":
    main()
