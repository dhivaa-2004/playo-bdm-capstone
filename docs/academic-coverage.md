# Academic coverage matrix

The course assigns 20 marks to SQL-Driven EDA & Machine Learning Pipeline and 10 marks to the Technical PRD presentation. Lab exercises are separately assessed; broad course coverage does not turn every optional technology into a mandatory core feature.

| Outcome/sessions | Source | Concepts | Planned implementation | Evidence required |
|---|---|---|---|---|
| CO1; sessions 1–5 | Course pp.3,8–9 | Relational modelling, reliability, normalization; OLTP/OLAP trade-offs | core entities, junction tables, staging/private boundaries | Schema and constraint tests |
| CO2; sessions 6–8 | Course pp.9–10 | SELECT, filtering, grouping and aggregates | city/sport counts, NULL-aware rating summaries | Query/result comparison |
| CO3; sessions 9–10; Lab 1 | Course p.10 | Joins and Python database bridge | Python joins export Markdown summary | Executed standalone script |
| CO2/3; sessions 11–12; Lab 2 | Course pp.11–12 | JSONB ingestion, recursive hierarchy, time series | raw JSONB; pipeline time series; hierarchy only if justified | Roundtrip JSONB and upsert tests |
| CO2/3; sessions 13–15; Lab 3 | Course pp.12–13 | Windows, CTEs, cohorts and validation | venue rankings; actual snapshot trends; synthetic cohort demo only if explicitly identified | Saved queries and validation evidence |
| CO3; sessions 16–17 | Course pp.12–13 | Python ELT, staged schemas, transactions, telemetry | transactional batch load and SQL transforms | Rollback and repeat-run test |
| CO4; sessions 18–20; Lab 4 | Course pp.13–14 | pgvector, embeddings, chunking, LangChain/LlamaIndex | Conditional semantic venue text search; separately labelled lab demonstration if needed | Executed retrieval with model/dimension/cost documented |
| Core capstone; sessions 21–22 | Course pp.14–16 | SQL stats, features, supervised ML, evaluation, write-back | Database-to-model-to-database workflow | Complete run with holdout metrics and persisted predictions |
| CO5; sessions 23–24 | Course pp.16–17 | SQL push-down, plans, indexes, Green AI, retention | Bounded queries and simple models; caching/context pruning only if AI added | Measured before/after resource evidence |
| CO4; PRD presentation | Course p.6 | Technical PRD walkthrough | Product requirements, trade-offs, architecture and limitations | Final presentation tied to implemented evidence |

All database, ML, vector and application entries are PLANNED. The importer only verifies local source-envelope processing. No paid embedding API is selected. Do not claim Lab 4 completion from a conceptual description.
