-- Additive observability and moderation improvements for the existing project.
-- Historical records, model runs, predictions and community rows are preserved.

CREATE OR REPLACE FUNCTION private.stamp_submission_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status = 'pending' THEN
      NEW.moderated_at := NULL;
    ELSE
      IF NEW.verification_status = 'rejected'
         AND length(btrim(coalesce(NEW.moderation_note, ''))) < 3 THEN
        RAISE EXCEPTION 'Add a short moderation note before rejecting a venue'
          USING ERRCODE = '23514';
      END IF;
      NEW.moderated_at := now();
    END IF;
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.stamp_submission_moderation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS stamp_submission_moderation ON public.submitted_venues;
CREATE TRIGGER stamp_submission_moderation
BEFORE UPDATE OF verification_status ON public.submitted_venues
FOR EACH ROW EXECUTE FUNCTION private.stamp_submission_moderation();

CREATE OR REPLACE FUNCTION private.stamp_correction_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pending' THEN
      NEW.moderated_at := NULL;
    ELSE
      IF NEW.status = 'rejected'
         AND length(btrim(coalesce(NEW.moderation_note, ''))) < 3 THEN
        RAISE EXCEPTION 'Add a short moderation note before rejecting a report'
          USING ERRCODE = '23514';
      END IF;
      NEW.moderated_at := now();
    END IF;
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.stamp_correction_moderation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS stamp_correction_moderation ON public.venue_correction_reports;
CREATE TRIGGER stamp_correction_moderation
BEFORE UPDATE OF status ON public.venue_correction_reports
FOR EACH ROW EXECUTE FUNCTION private.stamp_correction_moderation();

CREATE INDEX IF NOT EXISTS submitted_venues_pending_idx
ON public.submitted_venues(submitted_at DESC, id)
WHERE verification_status = 'pending';

CREATE INDEX IF NOT EXISTS submitted_venues_approved_idx
ON public.submitted_venues(submitted_at DESC, id)
WHERE verification_status = 'approved';

CREATE INDEX IF NOT EXISTS venue_correction_reports_pending_idx
ON public.venue_correction_reports(submitted_at DESC, id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS predictions_run_split_idx
ON public.predictions(run_id, split, venue_id);

CREATE OR REPLACE FUNCTION public.lineage_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH quality AS (
    SELECT archive_hash, parser_version, quality, loaded_at
    FROM public.quality_reports
    ORDER BY loaded_at DESC, archive_hash
    LIMIT 1
  ), model AS (
    SELECT run_id, created_at, feature_version, dataset_hash, training_hash,
           model_name, split_summary
    FROM public.model_runs
    ORDER BY created_at DESC, run_id
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'dataset', jsonb_build_object(
      'source_dataset', 'playo-find-venue-master',
      'source_type', 'third_party_historical',
      'archive_hash', quality.archive_hash,
      'parser_version', quality.parser_version,
      'loaded_at', quality.loaded_at,
      'raw_rows', quality.quality->'raw_rows',
      'accepted_rows', quality.quality->'accepted_rows',
      'duplicate_rows', quality.quality->'duplicate_rows',
      'rated_rows', quality.quality->'rated_rows',
      'unrated_rows', quality.quality->'unrated_rows'
    ),
    'model', CASE WHEN model.run_id IS NULL THEN NULL ELSE jsonb_build_object(
      'run_id', model.run_id,
      'created_at', model.created_at,
      'feature_version', model.feature_version,
      'dataset_hash', model.dataset_hash,
      'training_hash', model.training_hash,
      'model_name', model.model_name,
      'split_summary', model.split_summary
    ) END,
    'tables', jsonb_build_array(
      jsonb_build_object('name','venues','role','Historical venue identity and coordinates','rows',(SELECT count(*) FROM public.venues)),
      jsonb_build_object('name','venue_ratings','role','Recorded rating evidence','rows',(SELECT count(*) FROM public.venue_ratings)),
      jsonb_build_object('name','venue_activities','role','Venue-to-activity many-to-many junction','rows',(SELECT count(*) FROM public.venue_activities)),
      jsonb_build_object('name','predictions','role','Versioned model outputs by split','rows',(SELECT count(*) FROM public.predictions)),
      jsonb_build_object('name','submitted_venues','role','Separate moderated community claims','rows',(SELECT count(*) FROM public.submitted_venues))
    ),
    'queries', jsonb_build_array(
      jsonb_build_object(
        'id','historical-counts','title','Historical coverage',
        'purpose','Counts all historical candidate records while keeping missing ratings explicit.',
        'sql','SELECT count(*) AS venues, count(*) FILTER (WHERE avg_rating IS NOT NULL) AS rated, count(*) FILTER (WHERE avg_rating IS NULL) AS unrated FROM venues JOIN venue_ratings USING (venue_id);'
      ),
      jsonb_build_object(
        'id','regional-evidence','title','Regional rating evidence',
        'purpose','Compares source-region coverage without treating a source region as a municipal boundary.',
        'sql','SELECT region, count(*) AS venues, avg(avg_rating) FILTER (WHERE avg_rating IS NOT NULL) AS mean_rating FROM venues JOIN venue_ratings USING (venue_id) GROUP BY region ORDER BY region;'
      ),
      jsonb_build_object(
        'id','activity-coverage','title','Activity and service coverage',
        'purpose','Uses the junction table because one venue can carry several labels.',
        'sql','SELECT label, count(DISTINCT venue_id) AS venues FROM venue_activities GROUP BY label ORDER BY venues DESC, label;'
      ),
      jsonb_build_object(
        'id','held-out-model','title','Held-out model evaluation',
        'purpose','Uses only test-split predictions for accuracy evidence.',
        'sql','SELECT p.split, count(*) AS records, avg(abs(p.predicted_rating-r.avg_rating)) AS mae FROM predictions p JOIN venue_ratings r USING (venue_id) WHERE p.run_id = :run_id AND p.split = ''test'' GROUP BY p.split;'
      )
    )
  )
  FROM quality
  LEFT JOIN model ON true
$$;
REVOKE ALL ON FUNCTION public.lineage_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lineage_summary() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.quality_drilldown()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH region_coverage AS (
    SELECT v.region,
           count(*) AS venues,
           count(*) FILTER (WHERE r.avg_rating IS NOT NULL) AS rated,
           count(*) FILTER (WHERE r.avg_rating IS NULL) AS unrated,
           round(100.0 * count(*) FILTER (WHERE r.avg_rating IS NULL) / count(*), 1) AS unrated_pct
    FROM public.venues v
    JOIN public.venue_ratings r USING (venue_id)
    GROUP BY v.region
  ), activity_counts AS (
    SELECT v.venue_id, count(a.label) AS labels
    FROM public.venues v
    LEFT JOIN public.venue_activities a USING (venue_id)
    GROUP BY v.venue_id
  ), activity_bands AS (
    SELECT CASE WHEN labels >= 4 THEN '4+' ELSE labels::text END AS band,
           count(*) AS venues,
           CASE WHEN labels >= 4 THEN 4 ELSE labels END AS ord
    FROM activity_counts
    GROUP BY 1, 3
  ), evidence_bands AS (
    SELECT CASE
      WHEN avg_rating IS NULL THEN 'Unrated'
      WHEN rating_count BETWEEN 1 AND 4 THEN '1–4 ratings'
      WHEN rating_count BETWEEN 5 AND 9 THEN '5–9 ratings'
      WHEN rating_count BETWEEN 10 AND 49 THEN '10–49 ratings'
      WHEN rating_count BETWEEN 50 AND 99 THEN '50–99 ratings'
      ELSE '100+ ratings' END AS band,
      count(*) AS venues,
      CASE
      WHEN avg_rating IS NULL THEN 0
      WHEN rating_count BETWEEN 1 AND 4 THEN 1
      WHEN rating_count BETWEEN 5 AND 9 THEN 2
      WHEN rating_count BETWEEN 10 AND 49 THEN 3
      WHEN rating_count BETWEEN 50 AND 99 THEN 4 ELSE 5 END AS ord
    FROM public.venue_ratings
    GROUP BY 1, 3
  )
  SELECT jsonb_build_object(
    'regions', (SELECT coalesce(jsonb_agg(to_jsonb(region_coverage) ORDER BY region), '[]'::jsonb) FROM region_coverage),
    'activity_multiplicity', (SELECT coalesce(jsonb_agg(jsonb_build_object('band',band,'venues',venues) ORDER BY ord), '[]'::jsonb) FROM activity_bands),
    'rating_evidence', (SELECT coalesce(jsonb_agg(jsonb_build_object('band',band,'venues',venues) ORDER BY ord), '[]'::jsonb) FROM evidence_bands),
    'coordinates', jsonb_build_object(
      'complete', (SELECT count(*) FROM public.venues WHERE latitude IS NOT NULL AND longitude IS NOT NULL),
      'missing', (SELECT count(*) FROM public.venues WHERE latitude IS NULL OR longitude IS NULL),
      'outside_valid_range', (SELECT count(*) FROM public.venues WHERE latitude NOT BETWEEN -90 AND 90 OR longitude NOT BETWEEN -180 AND 180)
    ),
    'labels', jsonb_build_object(
      'total', (SELECT count(*) FROM public.activity_labels),
      'explicitly_classified', (SELECT count(*) FROM public.activity_labels WHERE taxonomy_status <> 'unclassified_activity_or_service'),
      'unclassified', (SELECT count(*) FROM public.activity_labels WHERE taxonomy_status = 'unclassified_activity_or_service')
    )
  )
$$;
REVOKE ALL ON FUNCTION public.quality_drilldown() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quality_drilldown() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.model_diagnostics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH latest AS (
    SELECT run_id, model_name, metrics
    FROM public.model_runs
    ORDER BY created_at DESC, run_id
    LIMIT 1
  ), scored AS (
    SELECT p.predicted_rating, r.avg_rating,
           p.predicted_rating - r.avg_rating AS residual,
           abs(p.predicted_rating - r.avg_rating) AS absolute_error
    FROM public.predictions p
    JOIN latest l USING (run_id)
    JOIN public.venue_ratings r USING (venue_id)
    WHERE p.split = 'test' AND r.avg_rating IS NOT NULL
  ), residual_bands AS (
    SELECT CASE
      WHEN residual < -1 THEN '< -1.0'
      WHEN residual < -0.5 THEN '-1.0 to -0.5'
      WHEN residual < -0.25 THEN '-0.5 to -0.25'
      WHEN residual < 0 THEN '-0.25 to 0'
      WHEN residual < 0.25 THEN '0 to 0.25'
      WHEN residual < 0.5 THEN '0.25 to 0.5'
      WHEN residual < 1 THEN '0.5 to 1.0'
      ELSE '1.0+' END AS band,
      count(*) AS records,
      CASE
      WHEN residual < -1 THEN 0 WHEN residual < -0.5 THEN 1
      WHEN residual < -0.25 THEN 2 WHEN residual < 0 THEN 3
      WHEN residual < 0.25 THEN 4 WHEN residual < 0.5 THEN 5
      WHEN residual < 1 THEN 6 ELSE 7 END AS ord
    FROM scored
    GROUP BY 1, 3
  ), calibration AS (
    SELECT CASE
      WHEN avg_rating < 3 THEN '1–2.99'
      WHEN avg_rating < 4 THEN '3–3.99'
      WHEN avg_rating < 4.5 THEN '4–4.49'
      WHEN avg_rating < 5 THEN '4.5–4.99'
      ELSE '5' END AS observed_band,
      count(*) AS records,
      avg(avg_rating) AS mean_observed,
      avg(predicted_rating) AS mean_predicted,
      CASE WHEN avg_rating < 3 THEN 0 WHEN avg_rating < 4 THEN 1
           WHEN avg_rating < 4.5 THEN 2 WHEN avg_rating < 5 THEN 3 ELSE 4 END AS ord
    FROM scored
    GROUP BY 1, 5
  )
  SELECT jsonb_build_object(
    'run_id', latest.run_id,
    'overview', (SELECT jsonb_build_object(
      'records', count(*),
      'mean_error', avg(residual),
      'median_absolute_error', percentile_cont(0.5) WITHIN GROUP (ORDER BY absolute_error),
      'p90_absolute_error', percentile_cont(0.9) WITHIN GROUP (ORDER BY absolute_error),
      'within_half_star', count(*) FILTER (WHERE absolute_error <= 0.5),
      'over_estimates', count(*) FILTER (WHERE residual > 0),
      'under_estimates', count(*) FILTER (WHERE residual < 0)
    ) FROM scored),
    'baseline_improvement_pct', round(
      100 * (((latest.metrics->'dummy_median'->>'mae')::numeric - (latest.metrics->latest.model_name->>'mae')::numeric)
      / nullif((latest.metrics->'dummy_median'->>'mae')::numeric, 0)), 1
    ),
    'residuals', (SELECT coalesce(jsonb_agg(jsonb_build_object('band',band,'records',records) ORDER BY ord), '[]'::jsonb) FROM residual_bands),
    'calibration', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'observed_band', observed_band,
      'records', records,
      'mean_observed', mean_observed,
      'mean_predicted', mean_predicted
    ) ORDER BY ord), '[]'::jsonb) FROM calibration)
  )
  FROM latest
$$;
REVOKE ALL ON FUNCTION public.model_diagnostics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.model_diagnostics() TO anon, authenticated;

COMMENT ON FUNCTION public.lineage_summary() IS
'Sanitized aggregate lineage and SQL examples for the public academic dashboard; no raw rows or contact data.';
COMMENT ON FUNCTION public.quality_drilldown() IS
'Aggregate data-quality diagnostics for the historical dataset.';
COMMENT ON FUNCTION public.model_diagnostics() IS
'Held-out aggregate residual and calibration diagnostics for the latest stored model run.';
