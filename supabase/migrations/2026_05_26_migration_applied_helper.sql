-- ============================================================
-- migration_applied 알림 인프라
-- ------------------------------------------------------------
-- applied_migrations 테이블: 적용된 migration 이름 (= 파일명) 추적.
-- log_migration_applied(name, description) helper:
--   - applied_migrations 에 이미 있으면 NOOP (idempotent — 재실행 안전)
--   - 처음 적용이면 INSERT + admin_notifications(type='migration_applied') 발송
-- 사용법: 각 새 migration 파일 끝에 한 줄
--   SELECT log_migration_applied('2026_05_26_xxx', '설명');
-- ============================================================

CREATE TABLE IF NOT EXISTS applied_migrations (
  name        text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  applied_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE applied_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applied_migrations_service_all" ON applied_migrations;
CREATE POLICY "applied_migrations_service_all"
  ON applied_migrations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_migration_applied(p_name text, p_description text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  was_new boolean;
BEGIN
  INSERT INTO applied_migrations (name, description)
  VALUES (p_name, p_description)
  ON CONFLICT (name) DO NOTHING;

  -- 방금 row 가 추가됐는지 확인 (재실행 시 NOOP)
  GET DIAGNOSTICS was_new = ROW_COUNT;

  IF was_new THEN
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'migration_applied',
      '🛠 schema migration 적용',
      p_name || (CASE WHEN p_description <> '' THEN E'\n' || p_description ELSE '' END),
      jsonb_build_object('migration', p_name, 'description', p_description)
    );
  END IF;
END;
$$;

-- 자기 자신도 알림 (헬퍼 처음 도입)
SELECT log_migration_applied(
  '2026_05_26_migration_applied_helper',
  'applied_migrations 테이블 + log_migration_applied() helper 추가'
);
