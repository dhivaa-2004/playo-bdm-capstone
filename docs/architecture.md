# Implemented architecture

Immutable private historical archive → Python ETL → normalized Supabase PostgreSQL → SQL EDA / feature_store_v1 → grouped Python regression → persisted model runs and predictions → server API → React dashboard.

The empirical layer has 3,697 candidate records, no synthetic records, and unknown observation dates. Python read the SQL feature view through paginated PostgREST for the recorded model run. Python-generated import/write-back SQL was applied as database owner; a direct psycopg write-back was not exercised.

Public pages use bounded queries and database aggregates. Required region/activity labels and metrics come from the database. The server reads hosting runtime bindings; no service-role key exists in the application. The public frontend has no sign-in. Turnstile, column-limited grants, validation triggers and RLS protect submission/report writes. Private workspace records remain inaccessible to public visitors and never enter historical aggregates or features.

The current data lacks verified historical venue descriptions, timings, amenities and bookings. Those fields were intentionally not fabricated. No automated Playo collection, chatbot, payment flow or synthetic expansion is included. A coordinate-based map is implemented for the 3,697 historical rows, while the normal explorer remains the fallback for any future coordinate-less records. See `database-design.md` and `status.md` for the implemented scope.
