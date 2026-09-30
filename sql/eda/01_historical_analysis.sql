-- Every query is historical-only. NULL ratings stay excluded from rating summaries.
SELECT * FROM public.dataset_status;
SELECT * FROM public.region_statistics ORDER BY region;
-- Activity/service supply, not mutually exclusive populations.
SELECT label,count(*) venues,count(r.avg_rating) rated,avg(r.avg_rating) mean_rating
FROM public.venue_activities a JOIN public.venue_ratings r USING(venue_id)
GROUP BY label ORDER BY venues DESC,label;
-- CTE + windows: within-region rating rank, evidence threshold explicit.
WITH eligible AS (SELECT v.region,v.venue_id,r.avg_rating,r.rating_count
FROM public.venues v JOIN public.venue_ratings r USING(venue_id) WHERE rating_count>=20)
SELECT *,dense_rank() OVER(PARTITION BY region ORDER BY avg_rating DESC) AS region_rank FROM eligible;
-- Outlier and distribution statistics with ordered-set percentiles.
SELECT count(*) n,avg(avg_rating),var_samp(avg_rating),stddev_samp(avg_rating),
 percentile_cont(ARRAY[.25,.5,.75,.95]) WITHIN GROUP(ORDER BY avg_rating) quantiles,
 corr(avg_rating,ln(1+rating_count)) rating_log_count_correlation
FROM public.venue_ratings WHERE avg_rating IS NOT NULL;
-- Missing targets / LEFT JOIN; retained for prediction only.
SELECT v.region,count(*) unrated FROM public.venues v
LEFT JOIN public.venue_ratings r USING(venue_id) WHERE r.avg_rating IS NULL GROUP BY v.region;
-- Label co-occurrence self join; no phone or info fields involved.
SELECT a.label first_label,b.label second_label,count(*) venues FROM public.venue_activities a
JOIN public.venue_activities b ON a.venue_id=b.venue_id AND a.label<b.label
GROUP BY a.label,b.label ORDER BY venues DESC LIMIT 20;
-- EXPLAIN is read-only. A sequential scan can be optimal on this small dataset.
EXPLAIN(ANALYZE,BUFFERS) SELECT venue_id,name FROM public.venues WHERE region='chennai' ORDER BY name LIMIT 20;
