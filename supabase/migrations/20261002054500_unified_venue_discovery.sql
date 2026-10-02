-- Unified public discovery, preserving the historical analytical dataset.
-- Invoker security applies the existing underlying table grants and RLS.
CREATE OR REPLACE VIEW public.venue_catalog
WITH (security_invoker = true) AS
SELECT v.venue_id, v.name, v.region, v.latitude, v.longitude,
       v.source_type, v.is_synthetic, v.source_dataset, v.observed_at,
       r.avg_rating, r.rating_count,
       coalesce((SELECT array_agg(a.label ORDER BY a.label)
                 FROM public.venue_activities a WHERE a.venue_id = v.venue_id), ARRAY[]::text[]) AS activities,
       NULL::text AS locality, NULL::text AS address, NULL::text AS description,
       NULL::timestamptz AS submitted_at
FROM public.venues v
JOIN public.venue_ratings r USING (venue_id)
UNION ALL
SELECT s.id, s.name, s.region, s.latitude, s.longitude,
       s.source_type, s.is_synthetic, s.source_dataset, NULL::timestamptz,
       NULL::double precision, NULL::integer, s.activities,
       s.locality, s.address, s.description, s.submitted_at
FROM public.submitted_venues s
WHERE s.verification_status = 'approved';
REVOKE ALL ON public.venue_catalog FROM PUBLIC;
GRANT SELECT ON public.venue_catalog TO anon, authenticated;

-- Keep the existing historical-only search functions for analytical callers.
CREATE OR REPLACE FUNCTION public.venue_catalog_search(
 q text DEFAULT '', region_filter text DEFAULT '', activity_filter text DEFAULT '',
 min_count integer DEFAULT 0, min_rating double precision DEFAULT 0,
 sort_by text DEFAULT 'name', page_number integer DEFAULT 1, page_size integer DEFAULT 20,
 source_filter text DEFAULT ''
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 WITH filtered AS (
  SELECT c.* FROM public.venue_catalog c
  WHERE (q = '' OR strpos(lower(c.name), lower(left(q,160))) > 0)
    AND (region_filter = '' OR c.region = region_filter)
    AND (activity_filter = '' OR activity_filter = ANY(c.activities))
    AND (source_filter = '' OR
         (source_filter = 'historical' AND c.source_type = 'third_party_historical') OR
         (source_filter = 'community' AND c.source_type = 'user_submitted'))
    AND (min_count <= 0 OR c.rating_count >= min_count)
    AND (min_rating <= 0 OR c.avg_rating >= min_rating)
 ), ranked AS (
  SELECT f.*, row_number() OVER (
   ORDER BY CASE WHEN sort_by = 'rating_desc' THEN avg_rating END DESC NULLS LAST,
            CASE WHEN sort_by = 'count_desc' THEN rating_count END DESC NULLS LAST,
            name, venue_id, source_type
  ) AS pos FROM filtered f
 ), paged AS (
  SELECT * FROM ranked ORDER BY pos
  LIMIT least(greatest(page_size,1),50)
  OFFSET (least(greatest(page_number,1),10000)-1)*least(greatest(page_size,1),50)
 )
 SELECT jsonb_build_object(
  'total', (SELECT count(*) FROM filtered),
  'historical_total', (SELECT count(*) FROM filtered WHERE source_type = 'third_party_historical'),
  'community_total', (SELECT count(*) FROM filtered WHERE source_type = 'user_submitted'),
  'rows', coalesce((SELECT jsonb_agg(to_jsonb(paged) - 'pos' ORDER BY pos) FROM paged),'[]'::jsonb)
 );
$$;
REVOKE ALL ON FUNCTION public.venue_catalog_search(text,text,text,integer,double precision,text,integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.venue_catalog_search(text,text,text,integer,double precision,text,integer,integer,text) TO anon, authenticated;

-- Reconcile the activity-count view already applied during the previous chat.
CREATE OR REPLACE VIEW public.activity_directory
WITH (security_invoker = true) AS
WITH approved_community AS (
 SELECT activity.label, count(DISTINCT submission.id) AS approved_community_venues
 FROM public.submitted_venues submission
 CROSS JOIN LATERAL unnest(submission.activities) activity(label)
 WHERE submission.verification_status = 'approved'
 GROUP BY activity.label
)
SELECT labels.label,
       coalesce(historical.venues,0::bigint) AS venues,
       coalesce(community.approved_community_venues,0::bigint) AS approved_community_venues,
       coalesce(historical.venues,0::bigint) + coalesce(community.approved_community_venues,0::bigint) AS discoverable_venues,
       coalesce(historical.rated,0::bigint) AS rated,
       coalesce(historical.unrated,0::bigint) AS unrated,
       historical.mean_rating
FROM public.activity_labels labels
LEFT JOIN public.activity_statistics historical USING (label)
LEFT JOIN approved_community community USING (label);
REVOKE ALL ON public.activity_directory FROM PUBLIC;
GRANT SELECT ON public.activity_directory TO anon, authenticated;
COMMENT ON VIEW public.venue_catalog IS 'Historical records plus approved community claims for discovery; no pending claims, moderation notes or model features.';
COMMENT ON VIEW public.activity_directory IS 'Historical rating statistics with separate approved community and total discovery counts.';
NOTIFY pgrst, 'reload schema';
