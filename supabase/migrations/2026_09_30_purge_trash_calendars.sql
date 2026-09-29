-- ============================================================================
-- purge_trash_scheduled() — 휴지통 영구삭제에 달력(calendars) 포함
-- ----------------------------------------------------------------------------
-- 달력은 글·작업물과 같은 30일 휴지통을 쓴다(관리자가 달력을 지우면 deleted_at·purge_after 가 붙는다 —
-- /api/calendars/[id] DELETE). 그런데 매일 새벽 도는 이 함수는 2026_05_22 판 그대로 posts·works 만 지워,
-- 직접 지운 달력이 30일이 지나도 휴지통에 남았다. 앱의 /api/cron/purge-trash 와 setup.sql 은 이미
-- 달력까지 지운다 — 운영 DB 만 빠져 있던 것을 맞춘다.
--
-- 글·작업물을 지운다고 그 글이 쓰던 달력이 지워지지는 않는다 — 달력은 따로 저장되고 글은 ID 로 가리킬 뿐이다.
-- 호출 경로(safe_purge_trash_scheduled · pg_cron 'purge-trash-scheduled')는 그대로다.
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_trash_scheduled()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  posts_count int := 0;
  works_count int := 0;
  calendars_count int := 0;
  total int;
BEGIN
  WITH del AS (
    DELETE FROM posts
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO posts_count FROM del;

  WITH del AS (
    DELETE FROM works
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO works_count FROM del;

  WITH del AS (
    DELETE FROM calendars
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO calendars_count FROM del;

  total := posts_count + works_count + calendars_count;

  IF total > 0 THEN
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'purge',
      '🗑️ 휴지통 영구삭제',
      'posts ' || posts_count || '건, works ' || works_count || '건, calendars ' || calendars_count || '건 영구삭제됨',
      jsonb_build_object('posts', posts_count, 'works', works_count, 'calendars', calendars_count)
    );

    PERFORM _send_admin_email(
      '🗑️ 휴지통 영구삭제 ' || total || '건',
      '<p>아래 항목이 영구삭제되었습니다:</p><ul>'
        || '<li>posts: ' || posts_count || '건</li>'
        || '<li>works: ' || works_count || '건</li>'
        || '<li>calendars: ' || calendars_count || '건</li>'
        || '</ul>'
    );
  END IF;

  RETURN total;
END;
$$;

SELECT log_migration_applied(
  '2026_09_30_purge_trash_calendars',
  'purge_trash_scheduled — 휴지통 영구삭제에 calendars 포함 (앱 /api/cron/purge-trash 와 같은 범위)'
);

-- 확인
--   30일 지났는데 남아 있는 달력(적용 전에는 쌓여 있을 수 있다 — 다음 새벽 실행 때 지워진다)
--   SELECT count(*) FROM calendars WHERE deleted_at IS NOT NULL AND purge_after < now();
--   바로 비우려면: SELECT safe_purge_trash_scheduled();
