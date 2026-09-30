-- Bounded staging for environments with SQL Editor query-size limits.
BEGIN;
CREATE TABLE private.import_chunks(archive_hash text NOT NULL,part integer NOT NULL CHECK(part>=0),rows jsonb NOT NULL CHECK(jsonb_typeof(rows)='array'),PRIMARY KEY(archive_hash,part));
ALTER TABLE private.import_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.import_chunks FROM PUBLIC,anon,authenticated;
INSERT INTO private.schema_migrations VALUES('003_chunked_import',now());
COMMIT;
