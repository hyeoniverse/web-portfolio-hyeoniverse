-- ============================================================================
-- demo_usage — About 페이지 라이브 데모(번역 · 요약 · 커버 · 음성)의 하루 사용 횟수
-- ----------------------------------------------------------------------------
-- 방문자가 로그인 없이 실제 AI 공급자를 불러 보는 데모라 하루 상한을 둔다.
--   IP(HMAC 해시)마다 perIp 번, 사이트 전체 total 번. 날짜는 UTC 로 가르고 바뀌면 새로 센다.
-- 서버리스 함수는 인스턴스마다 메모리가 따로라 메모리로 세면 상한이 인스턴스 수만큼 늘어난다. 그래서 DB 에 센다.
--
-- 서버(service_role)만 쓴다 — RLS 를 켜고 정책은 두지 않는다. 함수 실행 권한도 anon · authenticated 에서 회수한다.
-- 상한 값은 앱(src/lib/demo/quota.ts, env DEMO_*_PER_IP / DEMO_*_TOTAL)이 넘긴다.
--
--   demo_take(feature, ip_hash, per_ip, total)    두 상한을 함께 보고 한 번 쓴다. 남은 횟수, 넘었으면 -1
--   demo_refund(feature, ip_hash, per_ip, total)  공급자가 모두 실패했을 때 한 번 돌려준다. 남은 횟수
--   demo_remaining(feature, ip_hash, per_ip, total) 지금 남은 횟수(쓰지 않음)
--
-- 같은 기능 · 같은 날의 요청은 advisory lock 으로 줄을 세운다. 합계를 읽고 더하는 사이에 다른 요청이 끼면
-- 두 요청이 같은 남은 횟수를 보고 둘 다 통과한다.
--
-- 보관: 7일 — 매일 UTC 18:45 (= KST 03:45) 지난 줄을 지운다. 하루가 지나면 셀 일이 없고 ip_hash 만 남는다.
--
-- 적용 전에도 사이트는 동작한다 — 데모 API 만 503(준비 중)을 돌려준다.
-- 사전 준비: Extensions 에서 pg_cron 활성화(이미 켜져 있으면 그대로).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.demo_usage (
  day      date NOT NULL,
  feature  text NOT NULL CHECK (feature IN ('translate', 'summary', 'cover', 'speech')),
  ip_hash  text NOT NULL,
  count    int  NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, feature, ip_hash)
);

ALTER TABLE public.demo_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_usage FROM anon, authenticated;

-- ── 쓰기 · 돌려주기 · 읽기 ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.demo_take(p_feature text, p_ip_hash text, p_per_ip int, p_total int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   date := (now() AT TIME ZONE 'UTC')::date;
  v_mine  int;
  v_total int;
BEGIN
  -- 상한이 0 이하면 꺼 둔 기능
  IF p_per_ip IS NULL OR p_total IS NULL THEN
    RETURN -1;
  END IF;
  IF p_per_ip <= 0 OR p_total <= 0 THEN
    RETURN -1;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('demo_usage:' || p_feature || ':' || v_day::text));

  SELECT COALESCE(SUM(count), 0) INTO v_total FROM public.demo_usage WHERE day = v_day AND feature = p_feature;
  SELECT COALESCE(MAX(count), 0) INTO v_mine FROM public.demo_usage WHERE day = v_day AND feature = p_feature AND ip_hash = p_ip_hash;

  -- 두 상한을 따로 본다
  IF v_mine >= p_per_ip THEN
    RETURN -1;
  END IF;
  IF v_total >= p_total THEN
    RETURN -1;
  END IF;

  INSERT INTO public.demo_usage (day, feature, ip_hash, count)
  VALUES (v_day, p_feature, p_ip_hash, 1)
  ON CONFLICT (day, feature, ip_hash) DO UPDATE SET count = public.demo_usage.count + 1;

  RETURN LEAST(p_per_ip - (v_mine + 1), p_total - (v_total + 1));
END;
$$;

CREATE OR REPLACE FUNCTION public.demo_refund(p_feature text, p_ip_hash text, p_per_ip int, p_total int)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('demo_usage:' || p_feature || ':' || v_day::text));
  UPDATE public.demo_usage SET count = count - 1
  WHERE day = v_day AND feature = p_feature AND ip_hash = p_ip_hash AND count > 0;
  RETURN public.demo_remaining(p_feature, p_ip_hash, p_per_ip, p_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.demo_remaining(p_feature text, p_ip_hash text, p_per_ip int, p_total int)
RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   date := (now() AT TIME ZONE 'UTC')::date;
  v_mine  int;
  v_total int;
BEGIN
  SELECT COALESCE(SUM(count), 0) INTO v_total FROM public.demo_usage WHERE day = v_day AND feature = p_feature;
  SELECT COALESCE(MAX(count), 0) INTO v_mine FROM public.demo_usage WHERE day = v_day AND feature = p_feature AND ip_hash = p_ip_hash;
  RETURN GREATEST(0, LEAST(COALESCE(p_per_ip, 0) - v_mine, COALESCE(p_total, 0) - v_total));
END;
$$;

-- 7일 지난 줄 지우기
CREATE OR REPLACE FUNCTION public.purge_old_demo_usage(retention_days int DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.demo_usage WHERE day < (now() AT TIME ZONE 'UTC')::date - retention_days;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_take(text, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demo_refund(text, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demo_remaining(text, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_old_demo_usage(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_take(text, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.demo_refund(text, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.demo_remaining(text, text, int, int) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN PERFORM cron.unschedule('purge-demo-usage'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('purge-demo-usage', '45 18 * * *', $$ SELECT public.purge_old_demo_usage(7); $$);

SELECT log_migration_applied(
  '2026_10_09_demo_usage',
  'demo_usage 테이블 + demo_take/demo_refund/demo_remaining (라이브 데모 하루 상한) + 7일 보관'
);

-- 확인
--   SELECT * FROM demo_usage ORDER BY day DESC, feature;
--   SELECT public.demo_remaining('translate', 'test', 3, 50);
--   SELECT * FROM cron.job WHERE jobname = 'purge-demo-usage';
-- 해제
--   SELECT cron.unschedule('purge-demo-usage');
