-- ============================================================
-- posts / works 정책을 4단계 권한 모델에 맞춘다 (2단계 준비)
-- ============================================================
--
-- 무엇이 틀렸나
--   2026_08_22_rls_admin_policies 가 건 posts 정책은 이렇다.
--
--     posts_admin_select  USING (is_admin())
--     posts_admin_insert  WITH CHECK (is_admin())
--     posts_admin_update  USING (can_edit_post(author_ids))
--     posts_admin_delete  USING (can_edit_post(author_ids))
--
--   is_admin() 을 owner 또는 레벨 2 이상으로 좁힌 뒤로 앞의 두 줄이 저자 등급을 막는다.
--   레벨 1 저자는 자기 초안을 조회할 수 없고(공개 글만 보인다) 새 글도 만들 수 없다.
--   수정·삭제는 되는데 조회·생성이 안 되는 상태라 앞뒤가 맞지 않는다.
--
--   지금까지 드러나지 않은 이유는 코드가 전부 service_role 로 접근해 정책을 타지 않기
--   때문이다. 2단계에서 세션 클라이언트로 옮기면 그 순간 저자의 편집기가 멈춘다.
--
-- 어떻게 바꾸나
--   SELECT 는 수정 권한과 같은 규칙을 쓴다 — owner/admin 은 전부, 저자는 자기 글.
--   공개 글은 기존 posts_public_read(published = true)가 OR 로 합쳐져 그대로 보인다.
--
--   INSERT 는 is_member() 로 둔다. 생성 시점에 author_ids 를 강제하면 편집기가 작성자를
--   채우기 전에 자동저장이 먼저 도는 경우 새 글이 만들어지지 않는다. 소유권은 만들어진
--   뒤의 UPDATE/DELETE 에서 강제된다.
--
--   works 에는 author_ids 가 없다. 소유권 개념이 없으므로 admin 이상만 다룬다
--   (TS 의 requirePostAccess 도 works 를 같은 규칙으로 판정한다).
--
-- 모든 정책에 TO authenticated 를 명시한다. 생략하면 PUBLIC 이 되어 anon 까지 후보에 든다.
-- ============================================================

-- ── posts ────────────────────────────────────────────────────
DROP POLICY IF EXISTS posts_admin_select ON posts;
CREATE POLICY posts_admin_select ON posts
  FOR SELECT TO authenticated
  USING (can_edit_post(author_ids));

DROP POLICY IF EXISTS posts_admin_insert ON posts;
CREATE POLICY posts_admin_insert ON posts
  FOR INSERT TO authenticated
  WITH CHECK (is_member());

DROP POLICY IF EXISTS posts_admin_update ON posts;
CREATE POLICY posts_admin_update ON posts
  FOR UPDATE TO authenticated
  USING (can_edit_post(author_ids))
  WITH CHECK (can_edit_post(author_ids));

DROP POLICY IF EXISTS posts_admin_delete ON posts;
CREATE POLICY posts_admin_delete ON posts
  FOR DELETE TO authenticated
  USING (can_edit_post(author_ids));

-- ── works ────────────────────────────────────────────────────
DROP POLICY IF EXISTS works_admin_select ON works;
CREATE POLICY works_admin_select ON works
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS works_admin_write ON works;
CREATE POLICY works_admin_write ON works
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── 확인 ─────────────────────────────────────────────────────
-- 1) 정책이 authenticated 로 한정됐는지 + 조건
--   SELECT c.relname, p.polname, p.polcmd,
--          array(SELECT rolname FROM pg_roles WHERE oid = ANY(p.polroles)) AS roles,
--          pg_get_expr(p.polqual, p.polrelid)      AS using_expr,
--          pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
--   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
--   WHERE c.relname IN ('posts','works') ORDER BY 1, 2;
--
-- 2) 정책이 통하려면 테이블 GRANT 가 있어야 한다. authenticated 에 4개가 다 나와야 한다.
--   SELECT table_name, privilege_type FROM information_schema.role_table_grants
--   WHERE grantee = 'authenticated' AND table_name IN ('posts','works')
--   ORDER BY 1, 2;
--
-- 3) 저자 시뮬레이션 — 자기 글만 보이는지 (author_id 는 실제 값으로)
--   BEGIN;
--   SELECT set_config('request.jwt.claims',
--     '{"role":"authenticated","app_metadata":{"role":"author","permission_level":1,"author_id":"author-xxx"}}', true);
--   SELECT count(*) FROM posts;               -- 공개 글 + 자기 글
--   SELECT is_member(), is_admin(), is_owner();
--   ROLLBACK;

SELECT log_migration_applied(
  '2026_08_25_fix_posts_tier_policies',
  'posts SELECT 를 can_edit_post 로, INSERT 를 is_member 로 정정 — is_admin() 을 레벨2 이상으로 좁힌 뒤 저자 등급이 자기 초안 조회·글 생성을 못 하던 문제. posts/works 전 정책에 TO authenticated 명시'
);
