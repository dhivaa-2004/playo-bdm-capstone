# Operations and administrator onboarding

The database project and public repository already exist; reuse them. Store configuration in environment variables. Never request or commit a service-role key or database password for ordinary website operations.

## First administrator
1. The intended owner creates an application account using the website Sign in → Create account flow and confirms their email. The Supabase dashboard account is not an application Auth account.
2. The project owner verifies the intended account identity in Supabase Auth. Do not infer it from similar names or promote every signed-up user.
3. As trusted database owner, insert that verified user UUID into `private.admin_members(user_id)`. The website cannot grant this role.
4. Refresh/sign in, then create, edit and archive a disposable workspace record. Confirm database state and audit events; historical counts must remain unchanged.
5. Remove membership to revoke write access immediately; RLS consults the membership table on each statement.

No account credentials or identity assumptions are embedded in migrations. The designated administrator subsequently confirmed their account and received protected admin membership. The user supplied evidence of successful login; browser CRUD acceptance remains pending.

## Verification and deployment
Run Python tests, SQL rollback-scoped access tests, frontend TypeScript/build checks, database API smoke tests and browser acceptance. Preserve returned errors; never report a zero-row update as success. Publish source and build from the same revision. Keep actual environment files, raw archives and row-level model artifacts out of git.

## Recovery
Apply additive changes; preserve the existing archive, model run and historical rows. Workspace archive is preferred over deletion. Rebuild public quality reports from private ingestion metadata only as database owner. Expired access sessions require sign-in again. No refresh-token persistence is currently implemented.

## API boundary
Public GET handlers whitelist data operations and validate search/UUID parameters. Writes whitelist fields, use parameterized PostgREST requests, validate Origin and rely on both admin/owner RLS. Arbitrary SQL, URLs and owner IDs are never accepted from the browser. Raw info/phones are absent from the public schema.
