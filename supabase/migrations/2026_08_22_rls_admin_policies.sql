-- ============================================================
-- RLS 관리자 정책 — service-role 우회를 정책 기반 인가로 옮기기 위한 1단계
-- ============================================================
--
-- 배경
--   지금까지 관리자 조회·수정은 service_role 키로 RLS 를 통째로 우회하고, 요청자가
--   관리자인지는 API 코드가 확인했다. 그 확인이 빠지면 그대로 샌다 — 실제로
--   `?all=true` 에 검문이 없어 비공개 글이 전량 노출된 적이 있다.
--
-- 이 마이그레이션이 하는 일
--   요청자의 JWT(app_metadata)를 읽어 관리자 여부·권한 레벨·연결된 저자를 판정하는
--   헬퍼와, 그 헬퍼를 쓰는 정책을 추가한다.
--
-- 안전성
--   **기존 정책을 지우지 않는다.** service_role 전체통과 정책도 그대로 두므로,
--   이 파일을 적용해도 현재 동작은 달라지지 않는다. 코드가 세션 클라이언트로 옮겨갈 때
--   비로소 이 정책들이 실제로 쓰인다. (2단계)
--
-- 알아둘 것
--   정책은 JWT 클레임만 볼 수 있다. 권한을 바꾸면 대상 계정의 토큰이 갱신되어야
--   반영된다. 이 프로젝트는 권한 변경 시 Realtime broadcast 로 세션을 새로 고치므로
--   지연이 짧지만, 0 은 아니다.
--
--   TS 쪽 getUserRole 은 OWNER_EMAIL 환경변수로도 owner 를 인정하지만 SQL 은 env 를
--   읽을 수 없다. 최초 로그인 시 ensureOwnerRole 이 app_metadata.role='owner' 를
--   박아 주므로 그 이후로는 정책도 owner 를 인식한다.
-- ============================================================

-- ── JWT 에서 권한 정보를 꺼내는 헬퍼 ──────────────────────────
-- STABLE: 한 문장 안에서 여러 행을 검사할 때 재평가되지 않도록.

CREATE OR REPLACE FUNCTION app_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

CREATE OR REPLACE FUNCTION app_level()
RETURNS int
LANGUAGE sql STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'permission_level')::int, 0);
$$;

CREATE OR REPLACE FUNCTION app_author_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'author_id';
$$;

/* 관리자 = owner 또는 author. 로그인만 했다고 관리자가 되지는 않는다. */
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT app_role() IN ('owner', 'author');
$$;

/* 사이트 설정·저자 관리 등 owner 전용 작업. */
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT app_role() = 'owner';
$$;

/* 대상 글을 편집할 수 있는가 — TS 의 canEditPost 와 같은 규칙.
   owner / editor(레벨 2 이상) 는 전부, author 는 author_ids 에 자신이 있을 때만. */
CREATE OR REPLACE FUNCTION can_edit_post(target_author_ids text[])
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT
    is_owner()
    OR app_level() >= 2
    OR (
      app_role() = 'author'
      AND app_author_id() IS NOT NULL
      AND app_author_id() = ANY (coalesce(target_author_ids, '{}'))
    );
$$;

-- ── posts ────────────────────────────────────────────────────
-- 기존: SELECT USING (published = true) — 공개 글만. 관리자 조회는 service_role 우회.
-- 추가: 관리자는 초안·휴지통까지 조회, 편집은 소유권까지 확인.

DROP POLICY IF EXISTS posts_admin_select ON posts;
CREATE POLICY posts_admin_select
  ON posts FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS posts_admin_insert ON posts;
CREATE POLICY posts_admin_insert
  ON posts FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS posts_admin_update ON posts;
CREATE POLICY posts_admin_update
  ON posts FOR UPDATE
  USING (can_edit_post(author_ids))
  WITH CHECK (can_edit_post(author_ids));

DROP POLICY IF EXISTS posts_admin_delete ON posts;
CREATE POLICY posts_admin_delete
  ON posts FOR DELETE
  USING (can_edit_post(author_ids));

-- ── works ────────────────────────────────────────────────────
-- works 에는 author_ids 가 없어 소유권 개념이 없다. 관리자면 전부 다룰 수 있다.

DROP POLICY IF EXISTS works_admin_select ON works;
CREATE POLICY works_admin_select
  ON works FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS works_admin_write ON works;
CREATE POLICY works_admin_write
  ON works FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── 확인용 ───────────────────────────────────────────────────
--   SELECT app_role(), app_level(), app_author_id(), is_admin(), is_owner();
--   SELECT polname, polcmd FROM pg_policy
--     WHERE polrelid = 'posts'::regclass ORDER BY polname;

SELECT log_migration_applied(
  '2026_08_22_rls_admin_policies',
  'RLS 관리자 정책 — app_metadata(JWT) 기반 is_admin/is_owner/can_edit_post + posts·works 정책 (service_role 정책은 유지)'
);
