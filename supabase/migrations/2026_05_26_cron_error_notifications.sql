-- ============================================================
-- cron_error 알림 — publish/purge cron 함수 실패 시 admin_notifications insert
-- ------------------------------------------------------------
-- 기존: publish_scheduled() / purge_trash_scheduled() 가 예외 던지면
--       cron 이 silent 실패 → 관리자는 알아챌 방법 없음.
-- 변경: safe_publish_scheduled() / safe_purge_trash_scheduled() wrapper 추가.
--       wrapper 가 EXCEPTION WHEN OTHERS 잡아 admin_notifications.type='cron_error' insert.
--       cron.schedule 도 wrapper 호출로 교체.
-- ============================================================

CREATE OR REPLACE FUNCTION safe_publish_scheduled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM publish_scheduled();
EXCEPTION WHEN OTHERS THEN
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
BEGIN
  PERFORM purge_trash_scheduled();
EXCEPTION WHEN OTHERS THEN
  INSERT INTO admin_notifications (type, title, message, metadata)
  VALUES (
    'cron_error',
    '⚠️ purge_trash_scheduled cron 에러',
    'purge_trash_scheduled() 실행 중 예외 발생: ' || SQLERRM,
    jsonb_build_object('function', 'purge_trash_scheduled', 'sqlstate', SQLSTATE, 'message', SQLERRM)
  );
END;
$$;

-- 기존 schedule 제거 + wrapper 로 재등록
DO $$ BEGIN PERFORM cron.unschedule('publish-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('purge-trash-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'publish-scheduled',
  '* * * * *',
  $$ SELECT safe_publish_scheduled(); $$
);

SELECT cron.schedule(
  'purge-trash-scheduled',
  '0 18 * * *',
  $$ SELECT safe_purge_trash_scheduled(); $$
);

SELECT log_migration_applied(
  '2026_05_26_cron_error_notifications',
  'safe_publish_scheduled / safe_purge_trash_scheduled wrapper — cron 실패 시 cron_error 알림'
);
