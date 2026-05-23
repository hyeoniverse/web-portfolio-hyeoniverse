-- ============================================================================
-- 예약 발행 + 휴지통 영구삭제 자동화 — pg_cron + pg_net + Vault
-- ----------------------------------------------------------------------------
-- 기존: Vercel cron(5분) → /api/cron/publish-scheduled → publish_scheduled() RPC
-- 변경: pg_cron 매분/매일 직접 실행 + admin_notifications 알림 + Resend 이메일
--
-- 사전 준비 (Supabase Dashboard):
-- 1. Extensions: pg_cron, pg_net 활성화
-- 2. Vault > Secrets 에 등록:
--      - name: resend_api_key   value: re_xxx... (Resend API key)
--      - name: admin_email      value: 관리자 이메일
--      - name: notify_from      value: 발신 이메일 (예: noreply@yourdomain.com, Resend 인증 도메인)
--    Vault 미등록 시 이메일 단계만 skip — admin_notifications insert 는 정상 실행
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ────────────────────────────────────────────────────────────
-- 유틸: Vault secret 안전 조회 (없으면 NULL 반환, 에러 무시)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v text;
BEGIN
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = secret_name LIMIT 1;
  RETURN v;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 유틸: Resend 이메일 발송 (Vault 비어있으면 skip)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _send_admin_email(subject text, html text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  api_key text := _get_vault_secret('resend_api_key');
  to_email text := _get_vault_secret('admin_email');
  from_email text := _get_vault_secret('notify_from');
BEGIN
  IF api_key IS NULL OR to_email IS NULL OR from_email IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body := jsonb_build_object(
      'from', from_email,
      'to', to_email,
      'subject', subject,
      'html', html
    )::text
  );
EXCEPTION WHEN OTHERS THEN
  -- 이메일 실패는 무시 (DB 본 작업은 성공해야)
  NULL;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- publish_scheduled() — 기존 RPC 대체 (발행 + admin_notifications + email)
-- return 컬럼 (title 추가) 이 이전 정의와 달라 CREATE OR REPLACE 불가 → DROP 후 재정의
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS publish_scheduled();

CREATE OR REPLACE FUNCTION publish_scheduled()
RETURNS TABLE(table_name text, id uuid, title text, was_scheduled_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  total int := 0;
  html_body text := '';
BEGIN
  -- 발행: posts + works 양쪽
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

  -- 알림 처리 — 위 RETURN QUERY 와 별개로 한 번 더 fetch (LANGUAGE plpgsql 의 RETURN QUERY 는 caller 에 stream)
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

  -- 이메일 — 한 번에 묶어 발송 (발행 건이 있을 때만)
  IF total > 0 THEN
    PERFORM _send_admin_email(
      '📝 예약 발행 ' || total || '건 완료',
      '<p>다음 항목이 발행되었습니다:</p><ul>' || html_body || '</ul>'
    );
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- purge_trash_scheduled() — 휴지통 영구삭제 + 알림
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION purge_trash_scheduled()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  posts_count int := 0;
  works_count int := 0;
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

  total := posts_count + works_count;

  IF total > 0 THEN
    INSERT INTO admin_notifications (type, title, message, metadata)
    VALUES (
      'purge',
      '🗑️ 휴지통 영구삭제',
      'posts ' || posts_count || '건, works ' || works_count || '건 영구삭제됨',
      jsonb_build_object('posts', posts_count, 'works', works_count)
    );

    PERFORM _send_admin_email(
      '🗑️ 휴지통 영구삭제 ' || total || '건',
      '<p>아래 항목이 영구삭제되었습니다:</p><ul>'
        || '<li>posts: ' || posts_count || '건</li>'
        || '<li>works: ' || works_count || '건</li>'
        || '</ul>'
    );
  END IF;

  RETURN total;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- pg_cron 등록 — 재실행 안전 (기존 unschedule 후 등록)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN PERFORM cron.unschedule('publish-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN PERFORM cron.unschedule('purge-trash-scheduled'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 발행: 매분 (작성된 RPC 호출, idempotent)
SELECT cron.schedule(
  'publish-scheduled',
  '* * * * *',
  $$ SELECT publish_scheduled(); $$
);

-- 삭제: 매일 UTC 18:00 (= KST 03:00)
SELECT cron.schedule(
  'purge-trash-scheduled',
  '0 18 * * *',
  $$ SELECT purge_trash_scheduled(); $$
);

-- ────────────────────────────────────────────────────────────
-- 확인 (참고용)
--   SELECT jobname, schedule, active FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--   SELECT * FROM admin_notifications WHERE type IN ('publish', 'purge') ORDER BY created_at DESC LIMIT 10;
-- 해제
--   SELECT cron.unschedule('publish-scheduled');
--   SELECT cron.unschedule('purge-trash-scheduled');
-- ────────────────────────────────────────────────────────────
