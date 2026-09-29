"""Offline JSONL importer. Preserve original bytes, provenance and rejections.

Run: python -m pipeline.ingest INPUT.jsonl --output NEW_OUTPUT_DIRECTORY
No web requests and no database writes are performed by this foundation.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import shutil

from .validation import InvalidRecord, normalize


def strict_json(line):
    def no_constant(value):
        raise ValueError(f"Non-finite JSON value: {value}")
    def unique_keys(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("Duplicate JSON key")
            result[key] = value
        return result
    return json.loads(line, parse_constant=no_constant, object_pairs_hook=unique_keys)


def ingest(source, output):
    source, output = Path(source).resolve(), Path(output).resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    # A new run directory is mandatory: reruns never overwrite previous evidence.
    output.mkdir(parents=True, exist_ok=False)
    raw = output / "raw.jsonl"
    shutil.copyfile(source, raw)
    digest = sha256()
    with raw.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    counts, sources, missing = Counter(), Counter(), Counter()
    seen = set()
    with raw.open("rb") as stream, (output / "venues.jsonl").open("w", encoding="utf-8") as clean, (output / "rejects.jsonl").open("w", encoding="utf-8") as rejected:
        for line_number, raw_line in enumerate(stream, 1):
            if not raw_line.strip():
                counts["blank_lines"] += 1
                continue
            counts["input_records"] += 1
            raw_hash = sha256(raw_line).hexdigest()
            try:
                record = normalize(strict_json(raw_line.decode("utf-8")))
                # Retain multiple dated observations, deduplicate a repeated observation.
                key = (record["entity_id"], record["observed_at"])
                if key in seen:
                    counts["duplicates"] += 1
                    rejected.write(json.dumps({"line": line_number, "reason": "duplicate observation", "raw_sha256": raw_hash}) + "\n")
                    continue
                seen.add(key)
                record.update({"raw_line": line_number, "raw_sha256": raw_hash})
                clean.write(json.dumps(record, ensure_ascii=False, allow_nan=False) + "\n")
                counts["accepted"] += 1
                sources[record["source_type"]] += 1
                for field in ("address", "description", "rating", "rating_count"):
                    if record[field] is None:
                        missing[field] += 1
            except (InvalidRecord, ValueError, UnicodeDecodeError) as error:
                counts["rejected"] += 1
                # Record a validation reason, never echo the input document into logs.
                reason = str(error) if isinstance(error, InvalidRecord) else "invalid JSON or UTF-8"
                rejected.write(json.dumps({"line": line_number, "reason": reason, "raw_sha256": raw_hash}) + "\n")
    for key in ("input_records", "accepted", "duplicates", "rejected", "blank_lines"):
        counts.setdefault(key, 0)
    assert counts["input_records"] == counts["accepted"] + counts["duplicates"] + counts["rejected"]
    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "input_sha256": digest.hexdigest(),
        "counts": dict(counts),
        "accepted_by_source": dict(sources),
        "missing_accepted_fields": dict(missing),
        "synthetic_share": sources["synthetic"] / counts["accepted"] if counts["accepted"] else None,
        "permission_review": "References recorded; permission must be verified before publishing/importing real records.",
        "database_loaded": False,
    }
    (output / "quality.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    report = ingest(args.input, args.output)
    print(json.dumps(report["counts"]))


if __name__ == "__main__":
    main()
