-- Replace public SECURITY DEFINER RPCs with column-limited inserts governed by
-- RLS. Validation that must inspect hidden rows stays in the private schema.
DROP FUNCTION public.submit_venue_claim(text,text,text,text,text,double precision,double precision,text[]);
DROP FUNCTION public.submit_venue_correction_report(text,uuid,text,text);

GRANT INSERT(name,region,locality,address,description,latitude,longitude,activities)
  ON public.submitted_venues TO anon,authenticated;
CREATE POLICY public_submit_pending
ON public.submitted_venues FOR INSERT TO anon,authenticated
WITH CHECK(
  source_type='user_submitted'
  AND source_dataset='public_venue_submissions'
  AND verification_status='pending'
  AND NOT is_synthetic
);

CREATE OR REPLACE FUNCTION private.validate_venue_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(73102411);
  IF (SELECT count(*) FROM public.submitted_venues
      WHERE submitted_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')>=200
     OR (SELECT count(*) FROM public.submitted_venues)>=10000 THEN
    RAISE EXCEPTION 'Public submission limit reached; try another day or contact the project owner' USING ERRCODE='P0001';
  END IF;
  NEW.name:=btrim(NEW.name);
  NEW.locality:=btrim(NEW.locality);
  IF EXISTS(
    SELECT 1 FROM unnest(NEW.activities) a
    WHERE a IS NULL
       OR NOT EXISTS(SELECT 1 FROM public.activity_labels l WHERE l.label=a)
  ) THEN
    RAISE EXCEPTION 'Choose activities from the activity directory' USING ERRCODE='23514';
  END IF;
  NEW.activities:=ARRAY(SELECT DISTINCT a FROM unnest(NEW.activities) a ORDER BY a);
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.validate_venue_submission() FROM PUBLIC,anon,authenticated;

GRANT INSERT(target_type,venue_id,submitted_venue_id,reason,details)
  ON public.venue_correction_reports TO anon,authenticated;
CREATE POLICY public_report_pending
ON public.venue_correction_reports FOR INSERT TO anon,authenticated
WITH CHECK(status='pending');

CREATE OR REPLACE FUNCTION private.validate_venue_correction_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
BEGIN
  IF NEW.target_type='historical' THEN
    IF NOT EXISTS(SELECT 1 FROM public.venues v WHERE v.venue_id=NEW.venue_id) THEN
      RAISE EXCEPTION 'Historical venue not found' USING ERRCODE='P0002';
    END IF;
  ELSIF NEW.target_type='submitted' THEN
    IF NOT EXISTS(
      SELECT 1 FROM public.submitted_venues s
      WHERE s.id=NEW.submitted_venue_id AND s.verification_status='approved'
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
  NEW.details:=btrim(NEW.details);
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.validate_venue_correction_report() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_venue_correction_report
BEFORE INSERT ON public.venue_correction_reports
FOR EACH ROW EXECUTE FUNCTION private.validate_venue_correction_report();

CREATE INDEX venue_correction_reports_venue_idx
ON public.venue_correction_reports(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX venue_correction_reports_submitted_venue_idx
ON public.venue_correction_reports(submitted_venue_id) WHERE submitted_venue_id IS NOT NULL;
