-- ============================================================================
-- service_logs — AI·외부 서비스·메일·GitHub·예약 작업의 성공/실패 기록
-- ----------------------------------------------------------------------------
-- 전에는 site_settings 의 한 줄(ai_log)에 최근 300건을 통째로 읽고 고쳐 썼다. 요청이 겹치면 한쪽 기록이
-- 빠지고, 메일·예약 작업까지 넣으면 300건이 금방 찬다. 기록 전용 테이블로 옮긴다.
--
-- category: ai(AI·이미지 검색·TTS) · mail(Resend) · github · cron(예약 작업) · contact(문의 폼 첨부)
-- provider: 공급자나 작업 이름(gemini, resend, publish-scheduled …)
-- 서버(service_role)만 읽고 쓴다 — RLS 를 켜고 정책은 두지 않는다. 화면은 /api/admin/ai-log(owner)로 본다.
--
-- 예약 작업은 DB 안의 pg_cron 이 돌리므로 여기서 감싸는 함수가 직접 남긴다.
--   publish-scheduled 는 매분 돌아서, 실제로 발행했거나 실패했을 때만 남긴다(하루 1,440줄 방지).
--   purge-trash-scheduled · anonymize-site-visits 는 하루 한 번이라 매번 남긴다.
-- 보관: 90일 — 매일 UTC 18:40 (= KST 03:40) 오래된 줄을 지운다.
--
-- 적용 전에도 사이트는 동작한다 — 앱은 이 테이블이 없으면 예전 자리(site_settings.ai_log)에 쓴다.
-- 사전 준비: Extensions 에서 pg_cron 활성화(이미 켜져 있으면 그대로).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_logs (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  category  text NOT NULL CHECK (category IN ('ai', 'mail', 'github', 'cron', 'contact')),
  provider  text NOT NULL,
  ok        boolean NOT NULL,
  kind      text,
  status    int,
  message   text,
  units     int,
  meta      jsonb
);

CREATE INDEX IF NOT EXISTS service_logs_at_idx ON public.service_logs (at DESC);
CREATE INDEX IF NOT EXISTS service_logs_category_at_idx ON public.service_logs (category, at DESC);

ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_logs FROM anon, authenticated;

-- ── 예약 작업 기록 ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._log_cron(job text, ok boolean, n int, msg text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.service_logs (category, provider, ok, kind, units, message)
  VALUES ('cron', job, ok, CASE WHEN ok THEN NULL ELSE 'server' END, n, msg);
EXCEPTION WHEN OTHERS THEN
  NULL; -- 기록 실패가 작업을 막지 않는다
END;
$$;

REVOKE ALL ON FUNCTION public._log_cron(text, boolean, int, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION safe_publish_scheduled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM publish_scheduled();
  IF n > 0 THEN
    PERFORM public._log_cron('publish-scheduled', true, n);
  END IF;
EXCEPTION WHEN OTHERS THEN
  PERFORM public._log_cron('publish-scheduled', false, NULL, SQLERRM);
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'cron_error',
    '⚠️ publish_scheduled cron 에러',
    'publish_scheduled() 실행 중 예외 발생: ' || SQLERRM,
    jsonb_build_object('function', 'publish_scheduled', 'sqlstate', SQLSTATE, 'message', SQLERRM)
  );
END;
$$;

CREATE OR REPLACE FUNCTION safe_purge_trash_scheduled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n int;
BEGIN
  n := purge_trash_scheduled();
  PERFORM public._log_cron('purge-trash-scheduled', true, n);
EXCEPTION WHEN OTHERS THEN
  PERFORM public._log_cron('purge-trash-scheduled', false, NULL, SQLERRM);
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'cron_error',
    '⚠️ purge_trash_scheduled cron 에러',
    'purge_trash_scheduled() 실행 중 예외 발생: ' || SQLERRM,
    jsonb_build_object('function', 'purge_trash_scheduled', 'sqlstate', SQLSTATE, 'message', SQLERRM)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.safe_anonymize_old_site_visits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  n := public.anonymize_old_site_visits(90);
  PERFORM public._log_cron('anonymize-site-visits', true, n);
EXCEPTION WHEN OTHERS THEN
  PERFORM public._log_cron('anonymize-site-visits', false, NULL, SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.safe_anonymize_old_site_visits() FROM PUBLIC, anon, authenticated;

-- 90일 지난 기록 지우기
CREATE OR REPLACE FUNCTION public.purge_old_service_logs(retention_days int DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.service_logs WHERE at < now() - make_interval(days => retention_days);
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_service_logs(int) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN PERFORM cron.unschedule('anonymize-site-visits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('anonymize-site-visits', '30 18 * * *', $$ SELECT public.safe_anonymize_old_site_visits(); $$);

DO $$ BEGIN PERFORM cron.unschedule('purge-service-logs'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('purge-service-logs', '40 18 * * *', $$ SELECT public.purge_old_service_logs(90); $$);

SELECT log_migration_applied(
  '2026_09_30_service_logs',
  'service_logs 테이블 + 예약 작업(publish/purge/anonymize) 기록 + 90일 보관'
);

-- 확인
--   SELECT category, provider, ok, at FROM service_logs ORDER BY at DESC LIMIT 20;
--   SELECT * FROM cron.job WHERE jobname IN ('publish-scheduled', 'purge-trash-scheduled', 'anonymize-site-visits', 'purge-service-logs');
-- 해제
--   SELECT cron.unschedule('purge-service-logs');
