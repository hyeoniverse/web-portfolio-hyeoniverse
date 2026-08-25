-- ============================================================
-- 작업물 편집 권한 — 팀원으로 등록된 멤버에게 그 작업물만 연다
-- ============================================================
--
-- 배경
--   works 에는 posts 의 author_ids 같은 소유권 컬럼이 없다. 그래서 지금까지 작업물은
--   admin 등급 이상만 다룰 수 있었고, 목록조차 열리지 않았다.
--
--   그런데 작업물에는 이미 팀원 목록(team_members jsonb)이 있다. 여기에 사이트 저자 프로필을
--   연결하면(author_id) "이 사람이 이 프로젝트에 참여한다" 를 데이터로 표현할 수 있다.
--   그것이 곧 그 작업물에 대한 편집 권한이다.
--
-- 바뀌는 규칙
--   조회  is_member()                      로그인한 멤버는 목록을 본다
--   생성  is_admin()                       새 작업물은 관리자만 만든다
--   수정  can_edit_work(team_members)      관리자 또는 그 작업물의 팀원
--   삭제  is_admin()                       되돌리기 어려우므로 관리자만
--
--   team_members 의 형태는 [{ "author_id": "...", "name": "...", ... }, ...] 다.
--   author_id 가 없는 항목(사이트 계정이 없는 외부 협업자)은 권한과 무관하다.
-- ============================================================

/** 이 작업물을 수정할 수 있는가 — TS 의 canEditWork 와 같은 규칙.
    관리자는 전부, 그 밖에는 team_members 에 자신의 저자 프로필이 들어 있을 때만. */
CREATE OR REPLACE FUNCTION can_edit_work(target_team_members jsonb)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT CASE
           WHEN is_admin() THEN true
           WHEN app_author_id() IS NULL THEN false
           /* 중첩 CASE 라야 타입 확인이 먼저 평가된다. 한 WHEN 안에서 AND 로 늘어놓으면
              Postgres 가 순서를 바꿀 수 있고, 배열이 아닌 값에 jsonb_array_elements 가 걸려 죽는다. */
           ELSE CASE jsonb_typeof(target_team_members)
                  WHEN 'array' THEN EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(target_team_members) AS m
                    WHERE m ->> 'author_id' = app_author_id()
                  )
                  ELSE false
                END
         END;
$$;

-- ── works 정책 재구성 ────────────────────────────────────────
DROP POLICY IF EXISTS works_admin_select ON works;
CREATE POLICY works_admin_select ON works
  FOR SELECT TO authenticated
  USING (is_member());

-- FOR ALL 하나로 묶여 있던 것을 명령별로 나눈다 — 수정만 팀원에게 열기 위해서다.
DROP POLICY IF EXISTS works_admin_write ON works;

DROP POLICY IF EXISTS works_admin_insert ON works;
CREATE POLICY works_admin_insert ON works
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS works_admin_update ON works;
CREATE POLICY works_admin_update ON works
  FOR UPDATE TO authenticated
  USING (can_edit_work(team_members))
  WITH CHECK (can_edit_work(team_members));

DROP POLICY IF EXISTS works_admin_delete ON works;
CREATE POLICY works_admin_delete ON works
  FOR DELETE TO authenticated
  USING (is_admin());

-- ── 확인 ─────────────────────────────────────────────────────
--   SELECT polname, polcmd,
--          pg_get_expr(polqual, polrelid)      AS using_expr,
--          pg_get_expr(polwithcheck, polrelid) AS check_expr
--   FROM pg_policy WHERE polrelid = 'works'::regclass ORDER BY polname;
--
--   -- 팀원 시뮬레이션 (author_id 는 실제 값으로)
--   BEGIN;
--   SELECT set_config('request.jwt.claims',
--     '{"role":"authenticated","app_metadata":{"role":"author","permission_level":1,"author_id":"author-xxx"}}', true);
--   SELECT id, title, can_edit_work(team_members) FROM works ORDER BY 2;
--   ROLLBACK;

SELECT log_migration_applied(
  '2026_08_25_work_team_member_access',
  '작업물 편집 권한을 team_members 로 확장 — 조회는 멤버 전체, 수정은 관리자 또는 그 작업물의 팀원(can_edit_work), 생성·삭제는 관리자'
);
