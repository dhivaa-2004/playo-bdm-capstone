-- Apply as project database owner. No raw HTML or phone column is created.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS private.ingestion_runs(
 archive_hash text PRIMARY KEY CHECK(length(archive_hash)=64), source_dataset text NOT NULL,
 parser_version text NOT NULL, quality jsonb NOT NULL, loaded_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.source_regions(region text PRIMARY KEY, display_name text NOT NULL);
CREATE TABLE IF NOT EXISTS public.venues(
 venue_id uuid PRIMARY KEY, source_key text UNIQUE NOT NULL, name text NOT NULL CHECK(length(name)>0),
 region text NOT NULL REFERENCES public.source_regions, latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180), entity_group uuid NOT NULL,
 source_type text NOT NULL CHECK(source_type='third_party_historical'), is_synthetic boolean NOT NULL CHECK(NOT is_synthetic),
 source_dataset text NOT NULL CHECK(source_dataset='playo-find-venue-master'), archive_hash text NOT NULL REFERENCES private.ingestion_runs,
 observed_at timestamptz CHECK(observed_at IS NULL));
CREATE TABLE IF NOT EXISTS public.venue_ratings(
 venue_id uuid PRIMARY KEY REFERENCES public.venues, avg_rating double precision CHECK(avg_rating BETWEEN 1 AND 5),
 rating_count integer NOT NULL CHECK(rating_count>=0),
 CHECK((rating_count=0 AND avg_rating IS NULL) OR (rating_count>0 AND avg_rating IS NOT NULL)));
CREATE TABLE IF NOT EXISTS public.activity_labels(label text PRIMARY KEY, taxonomy_status text NOT NULL DEFAULT 'unclassified_activity_or_service');
CREATE TABLE IF NOT EXISTS public.venue_activities(venue_id uuid REFERENCES public.venues, label text REFERENCES public.activity_labels,PRIMARY KEY(venue_id,label));
CREATE TABLE IF NOT EXISTS private.raw_lineage(
 archive_hash text REFERENCES private.ingestion_runs,source_file text,row_index integer CHECK(row_index>=0),
 member_hash text NOT NULL,record_hash text NOT NULL,venue_id uuid NOT NULL REFERENCES public.venues,
 PRIMARY KEY(archive_hash,source_file,row_index));
ALTER TABLE private.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.raw_lineage ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS venues_region_idx ON public.venues(region);
CREATE INDEX IF NOT EXISTS venues_name_idx ON public.venues(lower(name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS activities_label_idx ON public.venue_activities(label,venue_id);
CREATE TABLE IF NOT EXISTS public.model_runs(
 run_id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), feature_version text NOT NULL,
 dataset_hash text NOT NULL, training_hash text NOT NULL, model_name text NOT NULL, metrics jsonb NOT NULL,
 split_summary jsonb NOT NULL, sensitivity jsonb NOT NULL, parameters jsonb NOT NULL, versions jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS public.predictions(
 run_id uuid REFERENCES public.model_runs, venue_id uuid REFERENCES public.venues,
 predicted_rating double precision NOT NULL CHECK(predicted_rating BETWEEN 1 AND 5),
 split text NOT NULL CHECK(split IN ('train','test','unrated')),feature_hash text NOT NULL,
 PRIMARY KEY(run_id,venue_id));
-- User-owned workspace annotations/curation are separate from immutable empirical data.
CREATE TABLE IF NOT EXISTS public.workspace_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 venue_id uuid REFERENCES public.venues,name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 160),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=4000), archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.workspace_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,owner_id uuid NOT NULL,record_id uuid NOT NULL,
 action text NOT NULL,changed_at timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION private.workspace_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN NEW.owner_id:=OLD.owner_id;NEW.created_at:=OLD.created_at;NEW.updated_at:=now(); END IF;
 INSERT INTO public.workspace_audit(owner_id,record_id,action) VALUES(COALESCE(NEW.owner_id,OLD.owner_id),COALESCE(NEW.id,OLD.id),TG_OP);
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $$;
CREATE TRIGGER workspace_event BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_records FOR EACH ROW EXECUTE FUNCTION private.workspace_event();
ALTER TABLE public.source_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON public.source_regions FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_read ON public.venues FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_read ON public.venue_ratings FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_read ON public.activity_labels FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_read ON public.venue_activities FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_read ON public.model_runs FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_read ON public.predictions FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY owner_select ON public.workspace_records FOR SELECT TO authenticated USING(owner_id=(SELECT auth.uid()));
CREATE POLICY owner_insert ON public.workspace_records FOR INSERT TO authenticated WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY owner_update ON public.workspace_records FOR UPDATE TO authenticated USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY owner_delete ON public.workspace_records FOR DELETE TO authenticated USING(owner_id=(SELECT auth.uid()));
CREATE POLICY owner_audit ON public.workspace_audit FOR SELECT TO authenticated USING(owner_id=(SELECT auth.uid()));
REVOKE ALL ON public.source_regions,public.venues,public.venue_ratings,public.activity_labels,public.venue_activities,public.model_runs,public.predictions,public.workspace_records,public.workspace_audit FROM anon,authenticated;
GRANT SELECT ON public.source_regions,public.venues,public.venue_ratings,public.activity_labels,public.venue_activities,public.model_runs,public.predictions TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.workspace_records TO authenticated;
GRANT SELECT ON public.workspace_audit TO authenticated;
CREATE OR REPLACE FUNCTION private.load_historical(p jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v jsonb;l jsonb;existing text;
BEGIN
 IF p->>'source_type'<>'third_party_historical' OR (p->>'is_synthetic')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Historical source required';END IF;
 IF EXISTS(SELECT FROM private.ingestion_runs WHERE archive_hash=p->>'archive_hash') THEN RETURN jsonb_build_object('status','already_loaded');END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(p->'venues'))<>(p->'quality'->>'accepted_rows')::int THEN RAISE EXCEPTION 'Count mismatch';END IF;
 INSERT INTO private.ingestion_runs VALUES(p->>'archive_hash',p->>'source_dataset',p->>'parser_version',p->'quality',now());
 INSERT INTO public.source_regions VALUES('bangalore','Bangalore'),('chennai','Chennai'),('delhi','Delhi / NCR'),('hyderabad','Hyderabad') ON CONFLICT DO NOTHING;
 FOR v IN SELECT value FROM jsonb_array_elements(p->'venues') LOOP
 INSERT INTO public.venues VALUES((v->>'venue_id')::uuid,v->>'source_key',v->>'name',v->>'region',(v->>'latitude')::float8,(v->>'longitude')::float8,(v->>'entity_group')::uuid,p->>'source_type',false,p->>'source_dataset',p->>'archive_hash',NULL);
 INSERT INTO public.venue_ratings VALUES((v->>'venue_id')::uuid,(v->>'avg_rating')::float8,(v->>'rating_count')::int);
 INSERT INTO public.activity_labels(label) SELECT jsonb_array_elements_text(v->'labels') ON CONFLICT DO NOTHING;
 INSERT INTO public.venue_activities SELECT (v->>'venue_id')::uuid,jsonb_array_elements_text(v->'labels');
 FOR l IN SELECT value FROM jsonb_array_elements(v->'lineage') LOOP
 INSERT INTO private.raw_lineage VALUES(p->>'archive_hash',l->>'source_file',(l->>'row_index')::int,l->>'member_hash',l->>'record_hash',(v->>'venue_id')::uuid);
 END LOOP;
 END LOOP;
 IF (SELECT count(*) FROM private.raw_lineage WHERE archive_hash=p->>'archive_hash')<>(p->'quality'->>'raw_rows')::int THEN RAISE EXCEPTION 'Lineage count mismatch';END IF;
 RETURN p->'quality';
END $$;
REVOKE ALL ON FUNCTION private.load_historical(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.workspace_event() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE VIEW public.feature_store_v1 WITH(security_invoker=true) AS
 SELECT v.venue_id,v.entity_group,v.region,v.latitude,v.longitude,r.avg_rating AS target_avg_rating,r.rating_count,
 v.source_type,v.is_synthetic,v.archive_hash,'historical-v1'::text AS feature_version,
 (SELECT array_agg(a.label ORDER BY a.label) FROM public.venue_activities a WHERE a.venue_id=v.venue_id) AS activity_labels
 FROM public.venues v JOIN public.venue_ratings r USING(venue_id) WHERE NOT v.is_synthetic;
CREATE OR REPLACE VIEW public.dataset_status WITH(security_invoker=true) AS
 SELECT count(*) AS venues,count(*) FILTER(WHERE r.avg_rating IS NOT NULL) AS rated,
 count(*) FILTER(WHERE r.avg_rating IS NULL) AS unrated,count(DISTINCT region) AS regions,
 (SELECT count(*) FROM public.activity_labels) AS activity_labels,
 count(*) FILTER(WHERE is_synthetic) AS synthetic FROM public.venues v JOIN public.venue_ratings r USING(venue_id);
CREATE OR REPLACE VIEW public.region_statistics WITH(security_invoker=true) AS
 SELECT v.region,count(*) AS venues,count(r.avg_rating) AS rated,count(*) FILTER(WHERE r.avg_rating IS NULL) AS unrated,
 avg(r.avg_rating) AS mean_rating,percentile_cont(.5) WITHIN GROUP(ORDER BY r.avg_rating) AS median_rating,
 var_samp(r.avg_rating) AS rating_variance,stddev_samp(r.avg_rating) AS rating_stddev,
 percentile_cont(.25) WITHIN GROUP(ORDER BY r.avg_rating) AS q1,percentile_cont(.75) WITHIN GROUP(ORDER BY r.avg_rating) AS q3,
 corr(r.avg_rating,r.rating_count::float8) AS rating_count_correlation,
 percentile_cont(.5) WITHIN GROUP(ORDER BY r.rating_count) AS median_rating_count
 FROM public.venues v JOIN public.venue_ratings r USING(venue_id) GROUP BY v.region;
GRANT SELECT ON public.feature_store_v1,public.dataset_status,public.region_statistics TO anon,authenticated;
INSERT INTO private.schema_migrations(version) VALUES('001_historical');
COMMIT;
