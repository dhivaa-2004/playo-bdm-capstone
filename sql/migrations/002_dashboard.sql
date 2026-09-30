BEGIN;
CREATE OR REPLACE FUNCTION public.venue_search(q text DEFAULT '', region_filter text DEFAULT '', activity_filter text DEFAULT '', min_count integer DEFAULT 0, page_number integer DEFAULT 1, page_size integer DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH filtered AS (
 SELECT v.venue_id,v.name,v.region,v.latitude,v.longitude,v.source_type,v.is_synthetic,r.avg_rating,r.rating_count
 FROM public.venues v JOIN public.venue_ratings r USING(venue_id)
 WHERE (q='' OR v.name ILIKE '%'||left(q,160)||'%') AND (region_filter='' OR v.region=region_filter)
 AND r.rating_count>=greatest(min_count,0)
 AND (activity_filter='' OR EXISTS(SELECT FROM public.venue_activities a WHERE a.venue_id=v.venue_id AND a.label=activity_filter))
 ), paged AS (
 SELECT f.*,(SELECT array_agg(label ORDER BY label) FROM public.venue_activities a WHERE a.venue_id=f.venue_id) AS activities
 FROM filtered f ORDER BY f.name,f.venue_id LIMIT least(greatest(page_size,1),50) OFFSET (least(greatest(page_number,1),10000)-1)*least(greatest(page_size,1),50)
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'rows',coalesce((SELECT jsonb_agg(paged) FROM paged),'[]'::jsonb));
$$;
CREATE OR REPLACE FUNCTION public.dashboard_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('counts',(SELECT to_jsonb(s) FROM public.dataset_status s),
 'regions',(SELECT jsonb_agg(s ORDER BY region) FROM public.region_statistics s),
 'activities',(SELECT jsonb_agg(s) FROM (SELECT a.label,count(*) AS venues FROM public.venue_activities a GROUP BY a.label ORDER BY count(*) DESC,a.label LIMIT 15)s),
 'distribution',(SELECT jsonb_agg(s ORDER BY bucket) FROM (SELECT CASE WHEN avg_rating IS NULL THEN 'Unrated' WHEN avg_rating<3 THEN '1–2.99' WHEN avg_rating<4 THEN '3–3.99' WHEN avg_rating<4.5 THEN '4–4.49' WHEN avg_rating<5 THEN '4.5–4.99' ELSE '5' END bucket,count(*) venues FROM public.venue_ratings GROUP BY 1)s),
 'model',(SELECT to_jsonb(m) FROM public.model_runs m ORDER BY created_at DESC LIMIT 1));
$$;
REVOKE ALL ON FUNCTION public.venue_search(text,text,text,integer,integer,integer),public.dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.venue_search(text,text,text,integer,integer,integer),public.dashboard_summary() TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.quality_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('runs',coalesce(jsonb_agg(jsonb_build_object('archive_hash',archive_hash,'parser_version',parser_version,'quality',quality,'loaded_at',loaded_at)),'[]'::jsonb)) FROM private.ingestion_runs;
$$;
REVOKE ALL ON FUNCTION public.quality_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quality_summary() TO anon,authenticated;
INSERT INTO private.schema_migrations(version) VALUES('002_dashboard');
COMMIT;
