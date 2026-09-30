-- Publish only the aggregate audit report; avoid a public SECURITY DEFINER RPC.
CREATE TABLE public.quality_reports(
 archive_hash text PRIMARY KEY,
 parser_version text NOT NULL,
 quality jsonb NOT NULL,
 loaded_at timestamptz NOT NULL
);
ALTER TABLE public.quality_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON public.quality_reports FOR SELECT TO anon,authenticated USING(true);
REVOKE ALL ON public.quality_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.quality_reports TO anon,authenticated;
INSERT INTO public.quality_reports SELECT archive_hash,parser_version,quality,loaded_at FROM private.ingestion_runs;
CREATE FUNCTION private.publish_quality_report() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.quality_reports(archive_hash,parser_version,quality,loaded_at) VALUES(NEW.archive_hash,NEW.parser_version,NEW.quality,NEW.loaded_at)
 ON CONFLICT(archive_hash) DO UPDATE SET parser_version=EXCLUDED.parser_version,quality=EXCLUDED.quality,loaded_at=EXCLUDED.loaded_at;
 RETURN NEW;
END$$;
REVOKE ALL ON FUNCTION private.publish_quality_report() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER publish_quality AFTER INSERT OR UPDATE ON private.ingestion_runs FOR EACH ROW EXECUTE FUNCTION private.publish_quality_report();
CREATE OR REPLACE FUNCTION public.quality_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('runs',coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb)) FROM public.quality_reports r;
$$;
INSERT INTO private.schema_migrations(version) VALUES('005_public_quality_report');
