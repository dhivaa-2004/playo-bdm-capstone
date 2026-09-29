# Decision log

| ID | Decision | Reason | Revisit when |
|---|---|---|---|
| D01 | Treat course capstone requirements as mandatory; advanced topics conditional | distinguish course/lab breadth from project scope | new professor instruction |
| D02 | Do not collect Playo automatically yet | terms explicitly require consent | written permission or licensed dataset |
| D03 | Preserve master prompt's public-repository intent | do not silently change it to private after review block | user confirms public creation |
| D04 | Keep production schema/ML target provisional | no permitted raw dataset to profile | data becomes available |
| D05 | Build dependency-free offline importer first | useful, reversible work with meaningful validation | database loading phase |
| D06 | Do not label venue snapshots as transactions | booking history is not established | permissioned or explicitly simulated transactions |
| D07 | Separate test fixtures from project dataset | unit tests are not evidence of real data acquisition | approved dataset generation/import |
| D08 | Keep source course files out of public repository | supplied for reference, no redistribution request | explicit permission to redistribute |

Auto-review detail: the GitHub Create repository click was rejected because public visibility publishes project metadata without what the reviewer regarded as explicit authorization. No retry or alternate publishing route was used.


## 2026-09-29: approved repository and historical audit

Public creation explicitly approved and completed. The uploaded historical export supersedes the earlier missing-data gate. Latest audit recommendations govern data scope: preserve raw bytes, exclude target-leaking HTML from ML, keep provenance, and generate no synthetic records for core analysis. See historical-data-audit.md.
