# Requirement matrix

Mappings are plans, not claims of completion. Later direct user instructions take priority; professor materials define academic requirements.

| ID | Requirement | Source | Acceptance evidence | Status |
|---|---|---|---|---|
| R01 | Course/cheat sheet/ZIP inspection | Master §§1,24; Plan phases 0–2 | Source inventory and concept maps | Mapped |
| R02 | Public repository | Master §§6–8 | Public repo with source and secret scan | Blocked: approval review |
| R03 | Supabase infrastructure | Master §§6,9 | Dashboard access plus Python SQL roundtrip | Dashboard verified; Python pending |
| R04 | Responsible acquisition | Master §§3–4 | Permission/access record and reproducible acquisition | Historical ZIP audited; automated collection disabled |
| R05 | Real/synthetic separation | Master §5 | Provenance flags; separate counts and evaluation | Importer implemented; dataset pending |
| R06 | Raw evidence and lineage | Master §§10–11,63 | Original bytes, source URL, timestamp, record hash | Offline importer implemented |
| R07 | Mining/cleaning/validation | Master §§12–16 | Reconciled counts, nulls, rejects, duplicate policy | Partial: JSONL foundation tested |
| R08 | Normalized database | Master §17 | PK/FK/unique/check constraints, junction tables | Provisional design |
| R09 | SQL statistical EDA | Course pp.15–16; Master §§18–19 | Variance, stddev, quantiles, correlation results | Planned |
| R10 | SQL feature layer | Course p.15; Master §20 | Versioned database feature view/snapshot | Planned |
| R11 | Python reads PostgreSQL | Course pp.10,15–16 | Executed database input query and data hash | Planned |
| R12 | Supervised ML and split | Course pp.15–16; Master §21 | Train-only transforms, venue/time-aware split | Target pending data profile |
| R13 | Model evaluation | Master §22 | Baseline and holdout metrics from execution | Planned |
| R14 | Prediction write-back | Course p.16; Master §23 | Dedicated table populated by Python | Planned |
| R15 | Professor SQL concepts | Master §§24–28 | Query/purpose/result mapping | Mapped, not implemented |
| R16 | Auth and RLS | Master §§29,53–54 | Public-safe reads; non-admin writes rejected | Planned |
| R17 | Dynamic UI and CRUD | Master §§30,34–36,50–52 | Live database comparisons after mutations | Planned |
| R18 | Modular architecture | Master §§13,31–33,47 | Domain/services separation; small focused modules | Foundation implemented; application planned |
| R19 | Light-only blue/red UI | Master §§37–38 | Visual QA and no theme switch | Planned |
| R20 | Scrolling and responsive layout | Master §39 | Mobile/desktop tables/modals; no page overflow | Planned |
| R21 | Routing, history and URL filters | Master §§40–45 | Direct links, refresh, back/forward tests | Planned |
| R22 | Loading/empty/error/success | Master §46 | Visible state and failure tests without fake fallback | Planned |
| R23 | DB search/pagination | Master §§48–49 | Server-side filters and bounded payloads | Planned |
| R24 | Testing and performance | Master §§55–57 | Unit, SQL, role, live E2E, query plan evidence | Foundation tests only |
| R25 | Public deployment | Master §§58–59 | Verified production URL and backend integration | Planned |
| R26 | Migrations and ER diagram | Master §§60–62 | Versioned applied schema matches diagram | Provisional design only |
| R27 | Green Computing | Course pp.16–17; Master §67 | Measured SQL/payload/model efficiency choices | Planned |
| R28 | PRD, report, presentation | Course pp.6,16; Master §§66,69–71 | Evidence-based report/slides and reproducible setup | Initial PRD only |
| R29 | Final audit | Master §§72–76; Plan phases 58–60 | Every requirement linked to execution evidence | Not complete |

Review the acquisition and repository decisions before dependent production work.
