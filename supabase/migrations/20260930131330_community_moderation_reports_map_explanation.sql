-- Public submissions now enter a private moderation queue. Only records
-- explicitly approved by the database owner are readable through the API.
DROP POLICY IF EXISTS public_read ON public.submitted_venues;
DROP POLICY IF EXISTS public_submit ON public.submitted_venues;
REVOKE INSERT(name,region,locality,address,description,latitude,longitude,activities)
  ON public.submitted_venues FROM anon,authenticated;

ALTER TABLE public.submitted_venues
  DROP CONSTRAINT IF EXISTS submitted_venues_verification_status_check;
UPDATE public.submitted_venues
SET verification_status='pending'
WHERE verification_status='unverified';
ALTER TABLE public.submitted_venues
  ALTER COLUMN verification_status SET DEFAULT 'pending',
  ADD COLUMN moderated_at timestamptz,
  ADD COLUMN moderation_note text NOT NULL DEFAULT '' CHECK(length(moderation_note)<=1000),
  ADD CONSTRAINT submitted_venues_verification_status_check
    CHECK(verification_status IN ('pending','approved','rejected'));

DROP INDEX IF EXISTS public.submitted_venues_identity_idx;
CREATE UNIQUE INDEX submitted_venues_identity_idx
ON public.submitted_venues(
  lower(regexp_replace(btrim(name),'[^[:alnum:]]+','','g')),
  region,
  lower(regexp_replace(btrim(locality),'[^[:alnum:]]+','','g'))
);

CREATE POLICY public_read_approved
ON public.submitted_venues FOR SELECT TO anon,authenticated
USING(verification_status='approved');

CREATE OR REPLACE FUNCTION public.submit_venue_claim(
  p_name text,
  p_region text,
  p_locality text,
  p_address text,
  p_description text,
  p_latitude double precision,
  p_longitude double precision,
  p_activities text[]
)
RETURNS TABLE(id uuid,name text,verification_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  saved public.submitted_venues%ROWTYPE;
BEGIN
  INSERT INTO public.submitted_venues(
    name,region,locality,address,description,latitude,longitude,activities
  ) VALUES(
    p_name,p_region,p_locality,coalesce(p_address,''),coalesce(p_description,''),
    p_latitude,p_longitude,p_activities
  )
  RETURNING * INTO saved;

  RETURN QUERY SELECT saved.id,saved.name,saved.verification_status;
END
$$;
REVOKE ALL ON FUNCTION public.submit_venue_claim(text,text,text,text,text,double precision,double precision,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_venue_claim(text,text,text,text,text,double precision,double precision,text[]) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.venue_duplicate_candidates(
  p_name text,
  p_region text,
  p_locality text
)
RETURNS TABLE(source_type text,id uuid,name text,region text,locality text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path=''
AS $$
  WITH input AS (
    SELECT
      lower(regexp_replace(btrim(coalesce(p_name,'')),'[^[:alnum:]]+','','g')) normalized_name,
      lower(regexp_replace(btrim(coalesce(p_locality,'')),'[^[:alnum:]]+','','g')) normalized_locality
  )
  SELECT * FROM (
    SELECT 'third_party_historical'::text AS source_type,v.venue_id AS id,v.name,v.region,NULL::text AS locality
    FROM public.venues v,input i
    WHERE v.region=p_region
      AND lower(regexp_replace(btrim(v.name),'[^[:alnum:]]+','','g'))=i.normalized_name
    UNION ALL
    SELECT 'user_submitted'::text AS source_type,s.id,s.name,s.region,s.locality
    FROM public.submitted_venues s,input i
    WHERE s.region=p_region
      AND s.verification_status='approved'
      AND lower(regexp_replace(btrim(s.name),'[^[:alnum:]]+','','g'))=i.normalized_name
      AND (
        i.normalized_locality=''
        OR lower(regexp_replace(btrim(s.locality),'[^[:alnum:]]+','','g'))=i.normalized_locality
      )
  ) candidates
  ORDER BY source_type,name
  LIMIT 8
$$;
REVOKE ALL ON FUNCTION public.venue_duplicate_candidates(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.venue_duplicate_candidates(text,text,text) TO anon,authenticated;

-- Public correction reports are write-only. They can be reviewed in the
-- Supabase Table Editor without adding an administrator login to the website.
CREATE TABLE public.venue_correction_reports(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK(target_type IN ('historical','submitted')),
  venue_id uuid REFERENCES public.venues(venue_id),
  submitted_venue_id uuid REFERENCES public.submitted_venues(id),
  reason text NOT NULL CHECK(reason IN ('duplicate','closed_or_moved','incorrect_location','incorrect_activities','incorrect_name','other')),
  details text NOT NULL CHECK(length(btrim(details)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewed','resolved','rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,
  moderation_note text NOT NULL DEFAULT '' CHECK(length(moderation_note)<=1000),
  CHECK(
    (target_type='historical' AND venue_id IS NOT NULL AND submitted_venue_id IS NULL)
    OR
    (target_type='submitted' AND venue_id IS NULL AND submitted_venue_id IS NOT NULL)
  )
);
CREATE INDEX venue_correction_reports_status_idx
ON public.venue_correction_reports(status,submitted_at DESC);
ALTER TABLE public.venue_correction_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.venue_correction_reports FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.submit_venue_correction_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text
)
RETURNS TABLE(id uuid,status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  saved public.venue_correction_reports%ROWTYPE;
BEGIN
  IF p_target_type='historical' THEN
    IF NOT EXISTS(SELECT 1 FROM public.venues v WHERE v.venue_id=p_target_id) THEN
      RAISE EXCEPTION 'Historical venue not found' USING ERRCODE='P0002';
    END IF;
  ELSIF p_target_type='submitted' THEN
    IF NOT EXISTS(
      SELECT 1 FROM public.submitted_venues s
      WHERE s.id=p_target_id AND s.verification_status='approved'
    ) THEN
      RAISE EXCEPTION 'Community venue not found' USING ERRCODE='P0002';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid report target' USING ERRCODE='22023';
  END IF;

  PERFORM pg_advisory_xact_lock(73102412);
  IF (SELECT count(*) FROM public.venue_correction_reports
      WHERE submitted_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=100
     OR (SELECT count(*) FROM public.venue_correction_reports)>=5000 THEN
    RAISE EXCEPTION 'Public report limit reached' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.venue_correction_reports(
    target_type,venue_id,submitted_venue_id,reason,details
  ) VALUES(
    p_target_type,
    CASE WHEN p_target_type='historical' THEN p_target_id END,
    CASE WHEN p_target_type='submitted' THEN p_target_id END,
    p_reason,btrim(p_details)
  )
  RETURNING * INTO saved;

  RETURN QUERY SELECT saved.id,saved.status;
END
$$;
REVOKE ALL ON FUNCTION public.submit_venue_correction_report(text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_venue_correction_report(text,uuid,text,text) TO anon,authenticated;

-- One compact JSON value avoids Data API row caps while keeping the map read-only.
CREATE OR REPLACE FUNCTION public.venue_map_points(p_region text DEFAULT '')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path=''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'venue_id',v.venue_id,
    'name',v.name,
    'region',v.region,
    'latitude',v.latitude,
    'longitude',v.longitude,
    'avg_rating',r.avg_rating,
    'rating_count',r.rating_count
  ) ORDER BY v.name,v.venue_id),'[]'::jsonb)
  FROM public.venues v
  JOIN public.venue_ratings r USING(venue_id)
  WHERE v.latitude IS NOT NULL AND v.longitude IS NOT NULL
    AND (coalesce(p_region,'')='' OR v.region=p_region)
$$;
REVOKE ALL ON FUNCTION public.venue_map_points(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.venue_map_points(text) TO anon,authenticated;

ALTER TABLE public.model_runs ADD COLUMN explanation jsonb;
WITH target AS (
  SELECT run_id
  FROM public.model_runs
  WHERE feature_version='historical-v1'
    AND dataset_hash='aa02a50be5c2270502479d61b601d2933c96de4480cb6a2dc49ca7f1e9668b1f'
    AND training_hash='d3918ac9c8282a60cc689670bc7f44c00a417386c7fca1b2e2f5ac8e32f624fd'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE public.model_runs m
SET explanation='{
  "method":"Random-forest impurity importance from the frozen training-fitted model; descriptive, not causal.",
  "groups":[
    {"feature_group":"Location coordinates","importance":0.7904793892460477},
    {"feature_group":"Activities/services","importance":0.20476062669568906},
    {"feature_group":"Source region","importance":0.004759984058263394}
  ],
  "top_features":[
    {"feature":"latitude","importance":0.39880588523343713},
    {"feature":"longitude","importance":0.39167350401261053},
    {"feature":"activity=Badminton","importance":0.10434723818807097},
    {"feature":"activity=Box Cricket","importance":0.03328576261580489},
    {"feature":"activity=Swimming","importance":0.019809885371768216},
    {"feature":"activity=Pickleball","importance":0.01684007612506506}
  ]
}'::jsonb
FROM target
WHERE m.run_id=target.run_id;

COMMENT ON COLUMN public.model_runs.explanation IS
'Interpretation metadata derived from the frozen fitted model. Importances are descriptive and not causal.';
COMMENT ON TABLE public.venue_correction_reports IS
'Write-only public correction reports for database-owner moderation; excluded from historical analysis and ML.';
COMMENT ON TABLE public.submitted_venues IS
'Public user-entered venue claims. Pending/rejected rows are private; approved rows remain unverified community claims and are isolated from historical KPIs and ML.';
