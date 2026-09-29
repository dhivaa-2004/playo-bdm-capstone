# Data strategy — updated 29 September 2026

The user supplied playo-find-venue-master.zip as the historical third-party base. Preserve unchanged bytes and hashes in data/raw/playo_historical/. Do not run the archive collection scripts or workflow. Do not scrape, bulk crawl, use hidden APIs or bypass restrictions.

Current public Playo pages are domain/schema references only. See historical-data-audit.md for the two pages reviewed and complete findings. Unknown collection dates remain NULL. Historical does not mean verified current or provider-authorized data.

No raw dataset, phone details or third-party source files are published in the public repository. The archive includes an AGPL-v3 code licence; separate data redistribution rights were not established. Public outputs are project-authored code, documentation and aggregate metrics.

Every downstream record requires source_type, is_synthetic and source_dataset, plus immutable source lineage. Keep synthetic records separate. Core recommendation is zero synthetic records; optional simulation scope is 400 fictional records for schema/UI coverage only, not empirical ML evidence. No synthetic expansion generated.
