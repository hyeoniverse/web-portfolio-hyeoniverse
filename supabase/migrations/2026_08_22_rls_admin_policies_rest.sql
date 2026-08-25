-- ============================================================
-- RLS 권한 등급 정정 + 나머지 테이블 정책 (1단계 마무리)
-- ============================================================
--
-- 앞선 2026_08_22_rls_admin_policies 에서 정의한 is_admin() 이 잘못됐다.
--
--     is_admin() := app_role() IN ('owner', 'author')
--
-- 이러면 "자기 글만" 저자(레벨 1)까지 관리자로 취급된다. 신고 처리·방문 통계처럼
-- 중재 권한이 필요한 테이블까지 열리므로 등급 구분이 무너진다.
--
-- 코드의 권한 모델은 4단계다 (lib/api/roles.ts).
--   owner   전권 — 사이트 설정 · 저자 관리 포함
--   admin   모든 글 관리 + 댓글/신고 중재 (설정 · 저자 관리 제외)  · permission_level >= 2
--   author  자기 글만                                             · permission_level = 1
--   visitor 로그인 없음 — 공개 API 만
--
-- 헬퍼를 그 4단계에 맞춰 다시 정의하고, 테이블마다 필요한 등급으로 정책을 건다.
-- 기존 `TO service_role` 정책은 그대로 둔다(2단계 이후 정리).
--
-- 함께 필요한 운영 설정 — JWT 만료 시간
--   정책은 요청에 실린 JWT 의 app_metadata 만 볼 수 있다. 토큰은 발급 시점의 값을 담고
--   있으므로, 소유자가 권한을 낮춰도 그 계정의 access token 이 만료될 때까지는 예전 등급이
--   유효하다. 지금은 서버가 요청마다 getUser() 로 Auth 서버에 확인하기 때문에 강등이 즉시
--   걸리지만, 2단계에서 판정이 정책으로 넘어가면 이 창이 생긴다.
--
--   관리자 화면은 권한 변경 시 Realtime broadcast 를 받아 refreshSession() 을 부르므로
--   (AdminAuthSync) 브라우저가 열려 있으면 바로 반영된다. 남는 것은 앱 밖에서 토큰을 직접
--   들고 쓰는 경우고, 그 창의 상한이 JWT 만료 시간이다.
--
--   Supabase 대시보드 › Authentication › Sessions › Access Token (JWT) Expiry
--   기본 3600 초 → 600 초. 코드 변경은 없고 refresh 요청만 늘어난다.
--   (supabase-js 가 만료 전에 자동으로 갱신하므로 사용자에게는 드러나지 않는다)
-- ============================================================

-- ── 등급 헬퍼 재정의 ─────────────────────────────────────────

/** 소유자 — 사이트 설정 · 저자 관리. */
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app_role() = 'owner';
$$;

/** 관리자 — 모든 글 관리 + 중재. owner 는 항상 포함. (구 EDITOR) */
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app_role() = 'owner' OR app_level() >= 2;
$$;

/** 구성원 — 로그인한 owner/admin/author 전부. 자기 글 작업에 필요한 테이블용. */
CREATE OR REPLACE FUNCTION is_member()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app_role() IN ('owner', 'author');
$$;

-- can_edit_post 는 그대로 둔다 — owner/admin 은 전부, author 는 자기 글만.
--   (이미 app_level() >= 2 를 쓰고 있어 이름 변경과 무관하게 맞다)

-- ── owner 전용 ───────────────────────────────────────────────
-- site_settings   사이트 설정 (config jsonb)
-- author_invites  저자 초대 — 코드의 requireOwner 와 짝
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['site_settings', 'author_invites'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (is_owner()) WITH CHECK (is_owner())',
      t || '_owner_all', t);
    RAISE NOTICE 'owner: %', t;
  END LOOP;
END $$;

-- ── admin 이상 (중재 · 운영 지표) ────────────────────────────
-- 자기 글만 쓰는 저자에게는 열지 않는다.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'comments', 'work_comments', 'comment_reports', 'comment_reactions',
    'admin_notifications', 'site_visits', 'post_views', 'poll_votes'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())',
      t || '_admin_all', t);
    RAISE NOTICE 'admin: %', t;
  END LOOP;
END $$;

-- ── member 이상 (자기 글 작업에 필요) ────────────────────────
-- series / calendars / 연결 테이블 / revisions.
--   revisions 는 글 소유권까지 정책에서 확인하려면 posts.author_ids 조인이 필요하다.
--   지금 스키마로는 비용 대비 이득이 적어 member 로 열고, 어느 글의 스냅샷을 돌려줄지는
--   서버가 좁힌다(자동저장 복원은 편집 중인 글 하나만 조회).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'series', 'calendars', 'revisions',
    'post_work_relations', 'series_work_relations',
    -- 에디터 기능이라 저자도 쓴다 (커버 picker · 이모지 picker).
    -- 라우트도 requireAuth 만 걸려 있어 admin 으로 올리면 저자의 에디터가 막힌다.
    'custom_emojis', 'cover_image_history'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (is_member()) WITH CHECK (is_member())',
      t || '_member_all', t);
    RAISE NOTICE 'member: %', t;
  END LOOP;
END $$;

-- ── 앞선 마이그레이션이 만든 잘못된 등급 정리 ────────────────
-- rest 이전 버전에서 '_admin_all' 을 member 성격 테이블에 걸었다면 제거한다.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['series', 'calendars', 'revisions',
                           'post_work_relations', 'series_work_relations',
                           'custom_emojis', 'cover_image_history'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
  END LOOP;
END $$;

-- ── 정책을 만들지 않는 테이블 ────────────────────────────────
--   admin_login_attempts / admin_known_devices  인증 흐름에서 서버만 기록
--   applied_migrations                          SQL 에서만 사용
--   likes                                       토글은 서버가 IP 로 판정
--
-- ── 확인 ─────────────────────────────────────────────────────
--   SELECT c.relname, p.polname, pg_get_expr(p.polqual, p.polrelid) AS using_expr
--   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
--   WHERE p.polname ~ '_(owner|admin|member)_' ORDER BY 1, 2;

SELECT log_migration_applied(
  '2026_08_22_rls_admin_policies_rest',
  'RLS 권한 등급 4단계 정정(owner/admin/author/visitor) — is_admin() 을 level>=2 로 좁히고 is_member() 추가. owner 2개 · admin 10개 · member 5개 테이블에 정책 부여'
);
