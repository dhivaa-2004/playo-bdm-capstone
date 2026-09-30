-- Disposable role/CRUD smoke test. All fixture changes roll back.
BEGIN;
DO $$BEGIN
 IF (SELECT count(*) FROM public.venues)<>3697 OR (SELECT count(*) FROM public.venue_ratings WHERE avg_rating IS NOT NULL)<>3186 THEN RAISE EXCEPTION 'Count mismatch';END IF;
 IF (SELECT count(*) FROM private.raw_lineage)<>3701 THEN RAISE EXCEPTION 'Lineage mismatch';END IF;
 IF EXISTS(SELECT 1 FROM public.feature_store_v1 WHERE is_synthetic) THEN RAISE EXCEPTION 'Synthetic contamination';END IF;
END$$;
INSERT INTO auth.users(id,email) VALUES('10000000-0000-4000-8000-000000000001','bdm-test-a@example.invalid'),('10000000-0000-4000-8000-000000000002','bdm-test-b@example.invalid');
INSERT INTO private.admin_members(user_id) VALUES('10000000-0000-4000-8000-000000000001');
SET LOCAL ROLE anon;
DO $$BEGIN
 IF (SELECT count(*) FROM public.venues)<>3697 THEN RAISE EXCEPTION 'Public read failed';END IF;
 BEGIN INSERT INTO public.venues(venue_id) VALUES(gen_random_uuid());RAISE EXCEPTION 'Anonymous write allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN UPDATE public.venues SET name='Forbidden';RAISE EXCEPTION 'Anonymous update allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN DELETE FROM public.venues;RAISE EXCEPTION 'Anonymous delete allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM 1 FROM private.raw_lineage;RAISE EXCEPTION 'Private lineage exposed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END$$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
INSERT INTO public.workspace_records(id,name,note) VALUES('20000000-0000-4000-8000-000000000001','Disposable QA note','transaction rolls back');
UPDATE public.workspace_records SET name='Edited QA note',archived=true WHERE id='20000000-0000-4000-8000-000000000001';
DO $$BEGIN
 IF NOT EXISTS(SELECT FROM public.workspace_records WHERE name='Edited QA note' AND archived) THEN RAISE EXCEPTION 'Owner update failed';END IF;
 BEGIN UPDATE public.venues SET name='Forbidden';RAISE EXCEPTION 'Empirical mutation allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END$$;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$BEGIN
 IF public.is_admin() THEN RAISE EXCEPTION 'Non-admin elevated';END IF;
 BEGIN INSERT INTO public.workspace_records(name) VALUES('Forbidden own record');RAISE EXCEPTION 'Non-admin write';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN INSERT INTO private.admin_members(user_id) VALUES(auth.uid());RAISE EXCEPTION 'Self-elevation';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF EXISTS(SELECT FROM public.workspace_records WHERE id='20000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Cross-owner read';END IF;
 BEGIN INSERT INTO public.workspace_records(owner_id,name) VALUES('10000000-0000-4000-8000-000000000001','Forbidden');RAISE EXCEPTION 'Cross-owner insert';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END$$;
RESET ROLE;
INSERT INTO private.admin_members(user_id) VALUES('10000000-0000-4000-8000-000000000002');
SET LOCAL ROLE authenticated;
DO $$BEGIN
 IF EXISTS(SELECT FROM public.workspace_records WHERE id='20000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Cross-admin read';END IF;
 UPDATE public.workspace_records SET name='Forbidden cross-admin' WHERE id='20000000-0000-4000-8000-000000000001';
 IF FOUND THEN RAISE EXCEPTION 'Cross-admin update';END IF;
END$$;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
DELETE FROM public.workspace_records WHERE id='20000000-0000-4000-8000-000000000001';
DO $$BEGIN
 IF EXISTS(SELECT FROM public.workspace_records WHERE id='20000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Owner delete failed';END IF;
 IF (SELECT count(*) FROM public.workspace_audit WHERE record_id='20000000-0000-4000-8000-000000000001')<>3 THEN RAISE EXCEPTION 'Audit events missing';END IF;
END$$;
ROLLBACK;
SELECT 'PASS: counts, raw lineage, anonymous denial, admin CRUD, non-admin denial, self-elevation denial, cross-admin isolation, audit, rollback' AS security_checks;
