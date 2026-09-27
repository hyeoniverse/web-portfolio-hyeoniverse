-- 방문 IP 보관 기한 + 운영자 IP 제외 (#1169)
-- ----------------------------------------------------------------------------
-- 1) traffic_excluded_ips — 운영자가 '내 IP' 로 지정한 IP. 이 IP 의 방문은 기록하지 않고
--    이미 쌓인 방문도 트래픽 집계에서 뺀다. 서버(service_role)만 읽고 쓴다 — RLS 켜고 정책은 두지 않는다.
-- 2) anonymize_old_site_visits — 90일이 지난 기록의 원문 IP 를 지운다.
--    site_visits: (ip, date) 유니크를 지키려고 'anon:<id>' 로 바꾼다. 기기·국가·유입 등 집계 컬럼은 남는다.
--    post_views / work_views: IP 는 당일 중복 조회 방지에만 쓰이므로 NULL 로 비운다(조회수는 그대로).
-- 3) pg_cron 매일 UTC 18:30 (= KST 03:30) 실행. 사전 준비: Extensions 에서 pg_cron 활성화.
--
-- 적용 전에도 사이트는 동작한다 — 앱은 테이블이 없으면 제외 목록을 빈 것으로 본다.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_excluded_ips (
  ip         text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_excluded_ips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.traffic_excluded_ips FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.anonymize_old_site_visits(retention_days int DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.site_visits
     SET ip = 'anon:' || id::text
   WHERE date < CURRENT_DATE - retention_days
     AND ip NOT LIKE 'anon:%';
  GET DIAGNOSTICS affected = ROW_COUNT;

  UPDATE public.post_views
     SET ip = NULL
   WHERE viewed_date < CURRENT_DATE - retention_days
     AND ip IS NOT NULL;

  UPDATE public.work_views
     SET ip = NULL
   WHERE viewed_date < CURRENT_DATE - retention_days
     AND ip IS NOT NULL;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_old_site_visits(int) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN PERFORM cron.unschedule('anonymize-site-visits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'anonymize-site-visits',
  '30 18 * * *',
  $$ SELECT public.anonymize_old_site_visits(90); $$
);

-- 지금 쌓여 있는 90일 초과분도 바로 정리한다
SELECT public.anonymize_old_site_visits(90);

-- 확인
--   SELECT * FROM cron.job WHERE jobname = 'anonymize-site-visits';
--   SELECT count(*) FROM site_visits WHERE ip LIKE 'anon:%';
-- 해제
--   SELECT cron.unschedule('anonymize-site-visits');
