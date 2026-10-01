-- Run as database owner. Every fixture rolls back.
BEGIN;

INSERT INTO public.submitted_venues(name,region,locality,activities)
VALUES('TEST_ONLY_MODERATION_STAMP','chennai','Rollback area',ARRAY[(SELECT label FROM public.activity_labels ORDER BY label LIMIT 1)]);

UPDATE public.submitted_venues
SET verification_status='approved'
WHERE name='TEST_ONLY_MODERATION_STAMP';

DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.submitted_venues
    WHERE name='TEST_ONLY_MODERATION_STAMP'
      AND verification_status='approved'
      AND moderated_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Moderation timestamp was not recorded';
  END IF;

  BEGIN
    UPDATE public.submitted_venues
    SET verification_status='rejected', moderation_note=''
    WHERE name='TEST_ONLY_MODERATION_STAMP';
    RAISE EXCEPTION 'Rejection without a moderation note was permitted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  IF public.lineage_summary()->'dataset'->>'accepted_rows' <> '3697' THEN
    RAISE EXCEPTION 'Lineage summary count mismatch';
  END IF;
  IF jsonb_array_length(public.quality_drilldown()->'regions') <> 4 THEN
    RAISE EXCEPTION 'Quality regional summary mismatch';
  END IF;
  IF public.model_diagnostics()->'overview'->>'records' <> '639' THEN
    RAISE EXCEPTION 'Held-out diagnostic count mismatch';
  END IF;
END
$$;

ROLLBACK;
SELECT 'PASS: moderation stamps, rejection notes, lineage, quality and model diagnostics' AS enhancement_checks;
