CREATE TABLE public.submitted_venues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 160),
 region text NOT NULL REFERENCES public.source_regions(region),
 locality text NOT NULL CHECK(length(btrim(locality)) BETWEEN 2 AND 120),
 address text NOT NULL DEFAULT '' CHECK(length(address)<=400),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 latitude double precision CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision CHECK(longitude BETWEEN -180 AND 180),
 activities text[] NOT NULL CHECK(cardinality(activities) BETWEEN 1 AND 15),
 source_type text NOT NULL DEFAULT 'user_submitted' CHECK(source_type='user_submitted'),
 source_dataset text NOT NULL DEFAULT 'public_venue_submissions' CHECK(source_dataset='public_venue_submissions'),
 is_synthetic boolean NOT NULL DEFAULT false CHECK(NOT is_synthetic),
 verification_status text NOT NULL DEFAULT 'unverified' CHECK(verification_status='unverified'),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 CHECK((latitude IS NULL)=(longitude IS NULL))
);
CREATE UNIQUE INDEX submitted_venues_identity_idx ON public.submitted_venues(lower(btrim(name)),region,lower(btrim(locality)));
CREATE INDEX submitted_venues_created_idx ON public.submitted_venues(submitted_at DESC,id);
CREATE INDEX submitted_venues_region_idx ON public.submitted_venues(region);
ALTER TABLE public.submitted_venues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.submitted_venues FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.submitted_venues TO anon,authenticated;
GRANT INSERT(name,region,locality,address,description,latitude,longitude,activities) ON public.submitted_venues TO anon,authenticated;
CREATE POLICY public_read ON public.submitted_venues FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_submit ON public.submitted_venues FOR INSERT TO anon,authenticated WITH CHECK(source_type='user_submitted' AND verification_status='unverified' AND NOT is_synthetic);
CREATE FUNCTION private.validate_venue_submission() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 -- Serialize submissions so the small public demo's storage cap cannot race.
 PERFORM pg_advisory_xact_lock(73102411);
 IF (SELECT count(*) FROM public.submitted_venues WHERE submitted_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=200
 OR (SELECT count(*) FROM public.submitted_venues)>=10000 THEN
  RAISE EXCEPTION 'Public submission limit reached; try another day or contact the project owner' USING ERRCODE='P0001';
 END IF;
 NEW.name:=btrim(NEW.name); NEW.locality:=btrim(NEW.locality);
 IF EXISTS(SELECT 1 FROM unnest(NEW.activities) a WHERE a IS NULL OR NOT EXISTS(SELECT 1 FROM public.activity_labels l WHERE l.label=a)) THEN
  RAISE EXCEPTION 'Choose activities from the activity directory' USING ERRCODE='23514';
 END IF;
 NEW.activities:=ARRAY(SELECT DISTINCT a FROM unnest(NEW.activities) a ORDER BY a);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validate_venue_submission() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_venue_submission BEFORE INSERT ON public.submitted_venues FOR EACH ROW EXECUTE FUNCTION private.validate_venue_submission();
COMMENT ON TABLE public.submitted_venues IS 'Public user-entered venue claims, unverified. Isolated from historical KPIs, feature store, model training and evaluation. Anonymous insert/read only; no public update/delete.';
