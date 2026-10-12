-- ============================================================================
-- page_views 로 조회 기록 통일 — 2단계: 남은 줄 복사 후 옛 테이블 · 함수 삭제 (#1399)
-- ----------------------------------------------------------------------------
-- 1단계(2026_10_15_page_views_unify) → 새 코드 배포 → 운영에서 숫자를 확인한 뒤 이 파일을 적용한다.
-- 배포 전 옛 코드가 1단계 이후에 쓴 site_visits · post_views · work_views 줄을 한 번 더 옮기고(이미 옮긴 줄은 건너뛴다) 지운다.
-- 되돌릴 수 없다 — 지우기 전에 옮긴 수를 확인하려면 맨 아래 확인 쿼리를 먼저 돌린다.
-- ============================================================================

SELECT public._migrate_legacy_views();

-- 옛 방문 기록은 관리 화면(/admin/login 등)을 연 것도 랜딩으로 남겼다 — 새 기록은 관리 화면을 세지 않으므로
-- 경로만 비운다(방문 수는 그대로, 페이지별 · 흐름 집계에서 빠진다)
UPDATE public.page_views
   SET path = NULL
 WHERE migrated_from IS NOT NULL
   AND path ~ '^/(admin|api)(/|$)';

DROP FUNCTION IF EXISTS public._migrate_legacy_views();

-- 옛 기록 함수
DROP FUNCTION IF EXISTS public.record_post_view(uuid, text);
DROP FUNCTION IF EXISTS public.record_work_view(uuid, text);
DROP FUNCTION IF EXISTS public.increment_post_view_count(uuid);
DROP FUNCTION IF EXISTS public.sum_post_views();
DROP FUNCTION IF EXISTS public.daily_post_views(date, date);

-- 옛 테이블
DROP TABLE IF EXISTS public.site_visits;
DROP TABLE IF EXISTS public.post_views;
DROP TABLE IF EXISTS public.work_views;

-- 복사에만 쓰던 칸
DROP INDEX IF EXISTS public.uniq_page_views_legacy;
ALTER TABLE public.page_views DROP COLUMN IF EXISTS legacy_id;
ALTER TABLE public.page_views DROP COLUMN IF EXISTS legacy_visit_id;

-- IP 보관 기한 — 이제 page_views 하나만 비운다(이름은 cron 작업 · 기록과 맞추려고 그대로 둔다)
CREATE OR REPLACE FUNCTION public.anonymize_old_site_visits(retention_days int DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.page_views
     SET ip = NULL
   WHERE viewed_date < CURRENT_DATE - retention_days
     AND ip IS NOT NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_old_site_visits(int) FROM PUBLIC, anon, authenticated;

SELECT log_migration_applied(
  '2026_10_17_drop_legacy_views',
  'page_views 로 조회 기록 통일 2단계 — 남은 줄 복사 후 site_visits · post_views · work_views 와 옛 조회 함수 삭제'
);

-- 적용 전 확인(옮길 줄이 남았는지)
--   SELECT (SELECT count(*) FROM site_visits) AS visits, (SELECT count(*) FROM post_views) AS posts, (SELECT count(*) FROM work_views) AS works,
--          (SELECT count(*) FROM page_views WHERE migrated_from IS NOT NULL) AS migrated;
