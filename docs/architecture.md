# Implemented architecture

Immutable private historical archive → Python ETL → normalized Supabase PostgreSQL → SQL EDA / feature_store_v1 → grouped Python regression → persisted model runs and predictions → server API → React dashboard.

The empirical layer has 3,697 candidate records, no synthetic records, and unknown observation dates. Python read the SQL feature view through paginated PostgREST for the recorded model run. Python-generated import/write-back SQL was applied as database owner; a direct psycopg write-back was not exercised.

Public pages use bounded queries and database aggregates. Required region/activity labels and metrics come from the database. The server reads hosting runtime bindings; no service-role key exists in the application. HttpOnly access cookies are validated by Supabase Auth. Admin AND owner RLS protects workspace records; these never enter historical aggregates/features.

The current data lacks real venue descriptions, timings, amenities and bookings. Those tables and screens were intentionally not fabricated. No automated Playo collection, chatbot, map, payment or synthetic expansion is included. See database-design.md and status.md for actual implementation and remaining verification.
