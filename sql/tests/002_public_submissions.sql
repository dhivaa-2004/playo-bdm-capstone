-- Run as database owner. Fixture never persists.
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.submitted_venues(name,region,locality,activities)
VALUES('TEST_ONLY_ROLLBACK_VENUE','chennai','Test locality',ARRAY[(SELECT label FROM public.activity_labels ORDER BY label LIMIT 1)])
RETURNING id,source_type,verification_status,is_synthetic;
DO $$ BEGIN
 BEGIN INSERT INTO public.submitted_venues(name,region,locality,activities,source_type) VALUES('Invalid test','chennai','Test',ARRAY['Badminton'],'third_party_historical'); RAISE EXCEPTION 'FAIL forged provenance permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.submitted_venues SET name='tampered'; RAISE EXCEPTION 'FAIL update permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.submitted_venues; RAISE EXCEPTION 'FAIL delete permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.submitted_venues(name,region,locality,activities) VALUES('Invalid test','chennai','Test',ARRAY['NOT_A_REAL_LABEL']); RAISE EXCEPTION 'FAIL invalid activity permitted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.venues(name) VALUES('tampered'); RAISE EXCEPTION 'FAIL historical insert permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
