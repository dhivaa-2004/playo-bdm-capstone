-- Owner-run acceptance test. Every fixture and moderation change rolls back.
BEGIN;
CREATE TEMP TABLE discovery_fixture AS
 SELECT 'DISCOVERY_ROLLBACK_' || replace(gen_random_uuid()::text,'-','') AS prefix,
        (SELECT region FROM public.source_regions ORDER BY region LIMIT 1) AS region,
        (SELECT label FROM public.activity_labels ORDER BY label LIMIT 1) AS label,
        (SELECT count(*) FROM public.venue_catalog) AS catalog_before,
        (SELECT count(*) FROM public.venues) AS historical_before,
        (SELECT count(*) FROM public.feature_store_v1) AS features_before,
        (SELECT count(*) FROM public.predictions) AS predictions_before,
        (SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY run_id),'[]'::jsonb) FROM public.model_runs m) AS models_before,
        (SELECT approved_community_venues FROM public.activity_directory ORDER BY label LIMIT 1) AS activity_before;
GRANT SELECT ON discovery_fixture TO anon;
INSERT INTO public.submitted_venues(name,region,locality,activities)
SELECT prefix || suffix,region,'Rollback locality',ARRAY[label]
FROM discovery_fixture CROSS JOIN (VALUES ('_A'),('_B'),('_PENDING')) f(suffix);
SET LOCAL ROLE anon;
DO $$
BEGIN
 IF (SELECT (public.venue_catalog_search(q=>prefix)->>'total')::int FROM discovery_fixture) <> 0
 THEN RAISE EXCEPTION 'FAIL: pending venues leaked into search'; END IF;
 IF EXISTS (SELECT 1 FROM public.venue_catalog c, discovery_fixture f WHERE c.name LIKE f.prefix || '%')
 THEN RAISE EXCEPTION 'FAIL: pending detail leaked'; END IF;
END $$;
RESET ROLE;
UPDATE public.submitted_venues s SET verification_status='approved'
FROM discovery_fixture f WHERE s.name IN (f.prefix || '_A',f.prefix || '_B');
SET LOCAL ROLE anon;
DO $$
DECLARE f record; result jsonb; wrong_region text;
BEGIN
 SELECT * INTO f FROM discovery_fixture;
 result := public.venue_catalog_search(q=>f.prefix);
 IF (result->>'total')::int <> 2 OR (result->>'historical_total')::int <> 0
    OR (result->>'community_total')::int <> 2 OR jsonb_array_length(result->'rows') <> 2
 THEN RAISE EXCEPTION 'FAIL: approved catalog count %',result; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(result->'rows') r
            WHERE r->>'source_type' <> 'user_submitted' OR r->>'avg_rating' IS NOT NULL OR r->>'rating_count' IS NOT NULL)
 THEN RAISE EXCEPTION 'FAIL: community provenance or fabricated rating'; END IF;
 IF (SELECT count(*) FROM public.venue_catalog c WHERE c.name IN (f.prefix || '_A',f.prefix || '_B')) <> 2
 THEN RAISE EXCEPTION 'FAIL: approved venue details unavailable'; END IF;
 IF (public.venue_catalog_search(q=>f.prefix,region_filter=>f.region,activity_filter=>f.label,source_filter=>'community')->>'total')::int <> 2
 THEN RAISE EXCEPTION 'FAIL: region/activity/source filters'; END IF;
 IF (public.venue_catalog_search(q=>f.prefix,source_filter=>'historical')->>'total')::int <> 0
 OR (public.venue_catalog_search(q=>f.prefix,min_count=>1)->>'total')::int <> 0
 OR (public.venue_catalog_search(q=>f.prefix,min_rating=>3)->>'total')::int <> 0
 OR (public.venue_catalog_search(q=>f.prefix,activity_filter=>'NOT_A_LABEL')->>'total')::int <> 0
 OR (public.venue_catalog_search(q=>f.prefix,region_filter=>'NOT_A_REGION')->>'total')::int <> 0
 THEN RAISE EXCEPTION 'FAIL: filters include unsuitable community claims'; END IF;
 IF public.venue_catalog_search(q=>f.prefix,page_size=>1,page_number=>1)->'rows'->0->>'name' <> f.prefix || '_A'
 OR public.venue_catalog_search(q=>f.prefix,page_size=>1,page_number=>2)->'rows'->0->>'name' <> f.prefix || '_B'
 THEN RAISE EXCEPTION 'FAIL: stable pagination'; END IF;
 IF (SELECT approved_community_venues FROM public.activity_directory WHERE label=f.label) <> f.activity_before + 2
 THEN RAISE EXCEPTION 'FAIL: community activity counts'; END IF;
 IF (SELECT count(*) FROM public.venue_catalog) <> f.catalog_before + 2
 THEN RAISE EXCEPTION 'FAIL: total discovery count'; END IF;
 IF EXISTS (SELECT 1 FROM public.activity_directory WHERE discoverable_venues <> venues + approved_community_venues)
 THEN RAISE EXCEPTION 'FAIL: activity count arithmetic'; END IF;
END $$;
RESET ROLE;
UPDATE public.submitted_venues s SET verification_status='rejected',moderation_note='Rollback rejection check'
FROM discovery_fixture f WHERE s.name=f.prefix || '_B';
SET LOCAL ROLE anon;
DO $$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM discovery_fixture;
 IF (public.venue_catalog_search(q=>f.prefix)->>'total')::int <> 1
 OR (SELECT approved_community_venues FROM public.activity_directory WHERE label=f.label) <> f.activity_before + 1
 THEN RAISE EXCEPTION 'FAIL: revoked approval remains discoverable'; END IF;
 IF EXISTS (SELECT 1 FROM public.venue_catalog WHERE name=f.prefix || '_B')
 THEN RAISE EXCEPTION 'FAIL: rejected detail leaked'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM discovery_fixture;
 IF (SELECT count(*) FROM public.venues) <> f.historical_before
 OR (SELECT count(*) FROM public.feature_store_v1) <> f.features_before
 OR (SELECT count(*) FROM public.predictions) <> f.predictions_before
 OR (SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY run_id),'[]'::jsonb) FROM public.model_runs m) <> f.models_before
 THEN RAISE EXCEPTION 'FAIL: historical analysis changed'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: pending/approved/rejected RLS, search filters, pagination, activity counts and historical/model invariants; all fixtures rolled back' AS result;