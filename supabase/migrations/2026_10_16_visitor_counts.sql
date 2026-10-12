-- ============================================================================
-- visitor_counts — 오늘 · 전체 방문자 수 (#1399)
-- ----------------------------------------------------------------------------
-- 푸터와 대시보드 맨 위 숫자를 같은 값(방문자 = 사람 수)으로 맞춘다. 푸터는 모든 페이지에서 부르므로
-- 줄을 받아 세지 않고 DB 에서 센다. 방문자 = 방문의 첫 조회 줄의 visitor_id(옛 기록은 IP), 봇 · '내 IP' 제외 —
-- 대시보드(/api/admin/dashboard)가 같은 기준으로 센다.
--
-- 2026_10_15_page_views_unify 다음, 새 코드 배포 전에 적용한다. 적용 전에는 푸터가 0 을 보인다(화면 오류는 없다).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.visitor_counts(p_today date, p_excluded text[] DEFAULT '{}')
RETURNS TABLE(today bigint, total bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT COALESCE(visitor_id, ip)) FILTER (WHERE viewed_date = p_today) AS today,
         COUNT(DISTINCT COALESCE(visitor_id, ip)) AS total
    FROM page_views
   WHERE is_landing
     AND (device_kind IS NULL OR device_kind <> 'bot')
     AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))));
$$;

REVOKE ALL ON FUNCTION public.visitor_counts(date, text[]) FROM PUBLIC, anon, authenticated;

SELECT log_migration_applied(
  '2026_10_16_visitor_counts',
  'visitor_counts — 오늘 · 전체 방문자 수(푸터 · 대시보드 같은 기준)'
);

-- 확인
--   SELECT * FROM public.visitor_counts((now() AT TIME ZONE 'Asia/Seoul')::date);
