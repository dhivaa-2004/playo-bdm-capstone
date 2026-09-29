# Offline input contract, version 0.1

Each non-empty line is one JSON object with these fields:

| Field | Required | Meaning |
|---|---|---|
| source_type | yes | playo_public, licensed_other or synthetic |
| source_id | yes | stable entity key within provenance namespace |
| observed_at | yes | ISO timestamp with timezone; normalized to UTC |
| source_url | for real data | HTTPS source URL; Playo records require a Playo host |
| permission_reference | for real data | reference to separately verified permission/licence evidence |
| venue.name / venue.city | yes | nonempty text |
| venue.sports | optional | list of text labels; normalized/deduplicated |
| venue.rating | optional | finite number between 0 and 5; absent stays NULL |
| venue.rating_count | optional | nonnegative integer; absent stays NULL |
| venue.address / venue.description | optional | text, whitespace normalized |

Synthetic records must have no real source URL. All fixtures in tests are fictional; they are not generated from a measured Playo distribution.

## Outputs and lineage

`raw.jsonl` preserves the imported file bytes. Clean observations retain raw line number/hash, source key/type, entity hash and timestamp. `rejects.jsonl` contains locations and reasons; raw rejected contents remain in the original private file. `quality.json` reconciles input records = accepted + duplicates + rejected, records blanks separately and calculates synthetic share only when accepted count is positive.

Duplicate policy: first valid record wins for the same source entity and UTC observation time. Later dated observations are retained. Conflicting same-time duplicates are quarantined; they are not merged automatically. Production entity resolution beyond stable source IDs is not implemented.

This importer does not scrape, load PostgreSQL, verify licence documents, parse arbitrary HTML, generate synthetic expansion, or implement the full data quality pipeline. Those remain later phases.
