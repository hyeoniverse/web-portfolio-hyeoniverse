-- ============================================================================
-- publish_scheduled() — "column reference 'id' is ambiguous" fix
-- ----------------------------------------------------------------------------
-- 원인: RETURNS TABLE(table_name text, id uuid, title text, ...) 의 컬럼들은
--       함수 안에서 묵시적 OUT 변수가 됨. 본문 SQL 의 SELECT id, title 이
--       해당 변수와 충돌해 PL/pgSQL 의 default `variable_conflict error` 모드가
--       매분 예외를 throw → safe_publish_scheduled() wrapper 가 catch 해서
--       admin_notifications(type='cron_error') 가 매분 쌓이고 있었음.
--
-- 수정: 함수 본문 맨 위에 `#variable_conflict use_column` 지시어 추가 →
--       SQL 의 unqualified `id`/`title` 은 컬럼으로 해석되도록.
-- ============================================================================

CREATE OR REPLACE FUNCTION publish_scheduled()
RETURNS TABLE(table_name text, id uuid, title text, was_scheduled_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
#variable_conflict use_column
DECLARE
  r RECORD;
  total int := 0;
  html_body text := '';
BEGIN
  RETURN QUERY
  WITH posts_pub AS (
    UPDATE posts SET published = true, scheduled_at = NULL, updated_at = now()
    WHERE published = false
      AND deleted_at IS NULL
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    RETURNING id, title, scheduled_at
  ),
  works_pub AS (
    UPDATE works SET published = true, scheduled_at = NULL, updated_at = now()
    WHERE published = false
      AND deleted_at IS NULL
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    RETURNING id, title, scheduled_at
  ),
  all_pub AS (
    SELECT 'posts'::text AS table_name, id, title, scheduled_at AS was_scheduled_at FROM posts_pub
    UNION ALL
    SELECT 'works'::text, id, title, scheduled_at FROM works_pub
  )
  SELECT * FROM all_pub;

  -- 알림 — 위 RETURN QUERY 와 별개로 fetch (RETURN QUERY 는 caller stream)
  FOR r IN
    SELECT 'posts'::text AS t, id, title FROM posts WHERE published = true AND updated_at > now() - interval '5 seconds' AND scheduled_at IS NULL
    UNION ALL
    SELECT 'works'::text, id, title FROM works WHERE published = true AND updated_at > now() - interval '5 seconds' AND scheduled_at IS NULL
  LOOP
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'publish',
      '📝 예약 발행 완료',
      r.t || ' "' || COALESCE(r.title, '(no title)') || '" 가 발행되었습니다.',
      jsonb_build_object('table', r.t, 'id', r.id)
    );
    total := total + 1;
    html_body := html_body || '<li><strong>' || r.t || '</strong>: ' || COALESCE(r.title, '(no title)') || '</li>';
  END LOOP;

  IF total > 0 THEN
    PERFORM _send_admin_email(
      '📝 예약 발행 ' || total || '건 완료',
      '<p>다음 항목이 발행되었습니다:</p><ul>' || html_body || '</ul>'
    );
  END IF;
END;
$$;

-- 누적된 cron_error 알림 정리 (옵션)
-- 동일 패턴이 매분 쌓여있을 가능성 — 수정 후 안 쌓이는 거 확인되면 수동 정리 권장.
-- DELETE FROM admin_notifications WHERE type = 'cron_error' AND metadata->>'function' = 'publish_scheduled';
