-- ============================================================================
-- page_views — 페이지 조회 기록 + 페이지별 머문 시간 (#1399)
-- ----------------------------------------------------------------------------
-- 대시보드의 "총 조회수"는 게시물 view_count 합계라, 홈 · About · 프로필 · 작업물을 본 횟수가 들어가지 않았다.
-- site_visits 는 IP 하루 1행(첫 페이지만)이라 페이지 조회수를 낼 수 없다. 페이지가 보일 때마다 한 행씩 남긴다.
--
--   record_page_view(path, ip, session) : 같은 IP 가 같은 경로를 30분 안에 다시 보면 새 행을 만들지 않고 앞 행 id 를 돌려준다
--                                         (새로고침 · 앞뒤 이동으로 부풀지 않게. 일반 분석 도구의 30분 세션 기준과 같다)
--   record_page_duration(id, ip, ms)   : 떠날 때 보인 채 있었던 시간을 그 행에 더한다. 탭을 숨길 때마다 나눠 보내 더해지고,
--                                         한 조회에 2시간까지만 센다(켜 두고 자리를 비운 탭이 평균을 끌어올리지 않게)
--   daily_page_views / page_view_stats / page_view_totals : 대시보드 · 트래픽 페이지 집계. '내 IP' 는 인자로 받아 뺀다
--
-- session_id 는 브라우저 저장소의 임의 값(30분 동안 아무것도 안 보면 새로 만든다) — 사람을 식별하지 않는다.
-- IP 는 site_visits 와 같은 보관 기한(90일 뒤 NULL, anonymize_old_site_visits)을 따른다.
-- 서버(service_role)만 읽고 쓴다 — RLS 켜고 정책은 두지 않는다.
--
-- 적용 전에도 사이트는 동작한다 — 기록 API 는 실패를 삼키고, 대시보드는 예전 값(게시물 조회수)을 보인다.
-- 지난 페이지 조회는 기록이 없어 채울 수 없다. 적용한 날부터 센다.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.page_views (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path        text NOT NULL,
  ip          text,
  session_id  text,
  viewed_at   timestamptz NOT NULL DEFAULT now(),
  viewed_date date GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'Asia/Seoul')::date) STORED,
  duration_ms integer
);

-- 일별 · 기간 집계
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_date ON public.page_views (viewed_date DESC);
-- 30분 중복 확인
CREATE INDEX IF NOT EXISTS idx_page_views_ip_path_at ON public.page_views (ip, path, viewed_at DESC);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_views FROM anon, authenticated;

-- 조회 기록 — 반환: 이 조회의 행 id (30분 안의 같은 조회면 앞 행 id). 머문 시간을 이 id 로 보낸다
CREATE OR REPLACE FUNCTION public.record_page_view(p_path text, p_ip text, p_session text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- 같은 IP · 경로의 동시 요청이 둘 다 새 행을 만들지 않게 줄 세운다
  PERFORM pg_advisory_xact_lock(hashtext('page_view:' || coalesce(p_ip, '') || ':' || p_path));

  SELECT id INTO v_id
    FROM page_views
   WHERE ip = p_ip AND path = p_path AND viewed_at > now() - interval '30 minutes'
   ORDER BY viewed_at DESC
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO page_views (path, ip, session_id)
  VALUES (p_path, p_ip, p_session)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 머문 시간 더하기 — 같은 IP 가 하루 안에 보낸 것만 받는다(남의 조회 id 로 시간을 부풀리지 못하게)
CREATE OR REPLACE FUNCTION public.record_page_duration(p_id uuid, p_ip text, p_ms integer)
RETURNS void
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  UPDATE page_views
     SET duration_ms = LEAST(COALESCE(duration_ms, 0) + GREATEST(p_ms, 0), 7200000)
   WHERE id = p_id
     AND ip IS NOT DISTINCT FROM p_ip
     AND viewed_at > now() - interval '1 day';
$$;

-- 일별 페이지 조회수 (KST)
CREATE OR REPLACE FUNCTION public.daily_page_views(p_start date, p_end date, p_excluded text[] DEFAULT '{}')
RETURNS TABLE(day date, views bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT viewed_date AS day, COUNT(*)::bigint AS views
    FROM page_views
   WHERE viewed_date >= p_start AND viewed_date <= p_end
     AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))))
   GROUP BY viewed_date
   ORDER BY viewed_date ASC;
$$;

-- 전체 합계와 처음 센 날 — 대시보드 "총 조회수"와 "언제부터 센 값인지"
CREATE OR REPLACE FUNCTION public.page_view_totals(p_excluded text[] DEFAULT '{}')
RETURNS TABLE(total bigint, since date)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint AS total, MIN(viewed_date) AS since
    FROM page_views
   WHERE ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}')));
$$;

-- 기간 집계 — 조회수 · 평균 머문 시간 · 방문(세션) 수 · 방문당 페이지 · 방문당 머문 시간 · 페이지별 조회수와 평균 머문 시간(상위 20)
-- 머문 시간 평균은 시간이 잡힌 조회만 센다(떠날 때 신호를 못 보낸 조회는 0 이 아니라 모르는 값)
CREATE OR REPLACE FUNCTION public.page_view_stats(p_start date, p_end date, p_excluded text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH v AS (
    SELECT path, session_id, duration_ms
      FROM page_views
     WHERE viewed_date >= p_start AND viewed_date <= p_end
       AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))))
  ), s AS (
    SELECT session_id, COUNT(*) AS n, SUM(COALESCE(duration_ms, 0)) AS ms
      FROM v
     WHERE session_id IS NOT NULL
     GROUP BY session_id
  ), p AS (
    SELECT path, COUNT(*) AS views, ROUND(AVG(duration_ms) FILTER (WHERE duration_ms > 0))::bigint AS avg_ms
      FROM v
     GROUP BY path
     ORDER BY views DESC, path
     LIMIT 20
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM v),
    'avg_duration_ms', (SELECT ROUND(AVG(duration_ms))::bigint FROM v WHERE duration_ms > 0),
    'sessions', (SELECT COUNT(*) FROM s),
    'pages_per_session', (SELECT ROUND(AVG(n)::numeric, 1) FROM s),
    'avg_session_ms', (SELECT ROUND(AVG(ms))::bigint FROM s),
    'top_paths', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('path', path, 'views', views, 'avg_ms', avg_ms) ORDER BY views DESC, path) FROM p),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.record_page_view(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_page_duration(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_page_views(date, date, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.page_view_totals(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.page_view_stats(date, date, text[]) FROM PUBLIC, anon, authenticated;

-- IP 보관 기한 — page_views 도 90일 뒤 IP 를 비운다(조회수 · 머문 시간은 그대로)
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

  UPDATE public.page_views
     SET ip = NULL
   WHERE viewed_date < CURRENT_DATE - retention_days
     AND ip IS NOT NULL;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_old_site_visits(int) FROM PUBLIC, anon, authenticated;

SELECT log_migration_applied(
  '2026_10_14_page_views',
  'page_views — 페이지 조회 기록(30분 중복 제거) + 페이지별 머문 시간, 대시보드 총 조회수를 페이지 조회수로'
);

-- 확인
--   SELECT viewed_date, count(*), round(avg(duration_ms)) FROM page_views GROUP BY 1 ORDER BY 1 DESC LIMIT 7;
--   SELECT public.page_view_stats(CURRENT_DATE - 6, CURRENT_DATE);
