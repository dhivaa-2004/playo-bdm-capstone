-- Additive revision. Historical data and trained model are untouched.
CREATE TABLE private.admin_members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.admin_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.admin_members FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT SELECT ON private.admin_members TO authenticated;
CREATE POLICY own_membership ON private.admin_members FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT FROM private.admin_members WHERE user_id=(SELECT auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
-- Restrictive policy composes with the existing owner policies: admin AND owner.
CREATE POLICY approved_admin ON public.workspace_records AS RESTRICTIVE FOR ALL TO authenticated
 USING((SELECT public.is_admin())) WITH CHECK((SELECT public.is_admin()));
CREATE POLICY approved_admin ON public.workspace_audit AS RESTRICTIVE FOR SELECT TO authenticated USING((SELECT public.is_admin()));
CREATE INDEX workspace_owner_updated_idx ON public.workspace_records(owner_id,updated_at DESC);
CREATE INDEX workspace_venue_idx ON public.workspace_records(venue_id);
CREATE INDEX audit_owner_changed_idx ON public.workspace_audit(owner_id,changed_at DESC);
CREATE INDEX predictions_venue_idx ON public.predictions(venue_id);
CREATE INDEX venues_archive_idx ON public.venues(archive_hash);
CREATE INDEX lineage_venue_idx ON private.raw_lineage(venue_id);
CREATE VIEW public.activity_statistics WITH(security_invoker=true) AS
 SELECT a.label,count(va.venue_id) venues,count(r.avg_rating) rated,
 count(va.venue_id)-count(r.avg_rating) unrated,avg(r.avg_rating) mean_rating
 FROM public.activity_labels a LEFT JOIN public.venue_activities va USING(label)
 LEFT JOIN public.venue_ratings r USING(venue_id) GROUP BY a.label;
CREATE VIEW public.region_directory WITH(security_invoker=true) AS
 SELECT s.*,sr.display_name,(SELECT count(DISTINCT a.label) FROM public.venues v JOIN public.venue_activities a USING(venue_id) WHERE v.region=s.region) activity_diversity
 FROM public.region_statistics s JOIN public.source_regions sr USING(region);
GRANT SELECT ON public.activity_statistics,public.region_directory TO anon,authenticated;
CREATE FUNCTION public.analytics_detail() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('overall',(SELECT jsonb_build_object('mean',avg(avg_rating),'median',percentile_cont(.5) WITHIN GROUP(ORDER BY avg_rating),'stddev',stddev_samp(avg_rating),'variance',var_samp(avg_rating),'q1',percentile_cont(.25) WITHIN GROUP(ORDER BY avg_rating),'q3',percentile_cont(.75) WITHIN GROUP(ORDER BY avg_rating),'correlation',corr(avg_rating,rating_count)) FROM public.venue_ratings),
 'rating_counts',(SELECT jsonb_agg(x ORDER BY ord) FROM (SELECT CASE WHEN rating_count=0 THEN 'Unrated / zero' WHEN rating_count<10 THEN '1–9' WHEN rating_count<50 THEN '10–49' WHEN rating_count<100 THEN '50–99' ELSE '100+' END bucket,CASE WHEN rating_count=0 THEN 0 WHEN rating_count<10 THEN 1 WHEN rating_count<50 THEN 2 WHEN rating_count<100 THEN 3 ELSE 4 END ord,count(*) venues FROM public.venue_ratings GROUP BY 1,2)x));
$$;
CREATE FUNCTION public.prediction_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH latest AS (SELECT run_id FROM public.model_runs ORDER BY created_at DESC,run_id LIMIT 1), p AS (SELECT p.* FROM public.predictions p JOIN latest USING(run_id))
 SELECT jsonb_build_object('splits',(SELECT jsonb_agg(x ORDER BY split) FROM (SELECT split,count(*) records,avg(predicted_rating) mean_prediction,min(predicted_rating) minimum,max(predicted_rating) maximum FROM p GROUP BY split)x),
 'distribution',(SELECT jsonb_agg(x ORDER BY split,bucket) FROM (SELECT split,floor(predicted_rating)::int bucket,count(*) records FROM p GROUP BY 1,2)x),'run_id',(SELECT run_id FROM latest));
$$;
CREATE FUNCTION public.venue_search_v2(q text DEFAULT '',region_filter text DEFAULT '',activity_filter text DEFAULT '',min_count integer DEFAULT 0,min_rating double precision DEFAULT 0,sort_by text DEFAULT 'name',page_number integer DEFAULT 1,page_size integer DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH filtered AS (
 SELECT v.venue_id,v.name,v.region,v.latitude,v.longitude,v.source_type,v.is_synthetic,r.avg_rating,r.rating_count
 FROM public.venues v JOIN public.venue_ratings r USING(venue_id)
 WHERE (q='' OR v.name ILIKE '%'||replace(replace(replace(left(q,160),'\','\\'),'%','\%'),'_','\_')||'%')
 AND (region_filter='' OR v.region=region_filter) AND r.rating_count>=greatest(min_count,0)
 AND (min_rating=0 OR r.avg_rating>=min_rating)
 AND (activity_filter='' OR EXISTS(SELECT FROM public.venue_activities a WHERE a.venue_id=v.venue_id AND a.label=activity_filter))
 ), ranked AS (
 SELECT f.*,row_number() OVER(ORDER BY CASE WHEN sort_by='rating_desc' THEN avg_rating END DESC NULLS LAST,CASE WHEN sort_by='count_desc' THEN rating_count END DESC NULLS LAST,name,venue_id) pos FROM filtered f
 ), paged AS (
 SELECT f.*,(SELECT array_agg(label ORDER BY label) FROM public.venue_activities a WHERE a.venue_id=f.venue_id) activities
 FROM ranked f ORDER BY pos LIMIT least(greatest(page_size,1),50) OFFSET (least(greatest(page_number,1),10000)-1)*least(greatest(page_size,1),50)
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'rows',coalesce((SELECT jsonb_agg(paged ORDER BY pos) FROM paged),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.analytics_detail(),public.prediction_summary(),public.venue_search_v2(text,text,text,integer,double precision,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_detail(),public.prediction_summary(),public.venue_search_v2(text,text,text,integer,double precision,text,integer,integer) TO anon,authenticated;
INSERT INTO private.schema_migrations(version) VALUES('004_admin_and_live_analytics');
