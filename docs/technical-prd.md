> Planning reference from the audit phase. Implemented state and verification are documented in README.md, status.md and database-design.md; these supersede any pending or proposed statements below.

# Technical PRD — initial scope

## Problem and users

The team needs to demonstrate how raw source information becomes a governed analytical data product. Readers explore venue supply and documented characteristics; administrators curate records and inspect ingestion quality; faculty trace each result back to SQL, Python and evidence.

## Product behavior

| Area | Required behavior | Acceptance evidence |
|---|---|---|
| Overview | database counts and source-aware summaries | SQL result equals rendered values |
| Venues | search, city/sport/rating filters, stable sort, pagination, detail | persisted URL filters; direct refresh and browser history work |
| Analytics | distributions, city/sport comparisons, rating analysis | query/result/chart mapping |
| Predictions | real stored model output, metrics, version, stale state | database-to-UI comparison after a model run |
| Data quality | run counts, rejection/missingness, provenance proportions | input/output reconciliation |
| Administration | authorized add/edit/archive and separate audit domain | unauthenticated/non-admin writes rejected; admin transaction persisted |

## UX constraints

Light theme only; blue/red identity with light surfaces and neutral readable text. Natural full-page scrolling, accessible keyboard interaction, responsive desktop/tablet/mobile. Bounded scroll only for large tables/modals. Distinct loading, empty, error and success states; failure never falls back to fabricated records. No dark-mode toggle.

## Nonfunctional requirements

Modular services/domains; bounded SQL and payloads; no browser-side whole-database analytics; secrets excluded from public code; RLS enforced in PostgreSQL; migration history reproducible; pipeline/model repeatable; meaningful tests and measured query optimization. Public access must not provide database administration.

## Release gate

One full authorized source → raw → clean → database → SQL features → ML → predictions → UI run, plus live CRUD verification, role security tests, deep links, refresh/history, mobile layout and clean browser/network logs. Final report/slides contain only measured outcomes. A source-restricted or synthetic-only version must prominently state its limits.
