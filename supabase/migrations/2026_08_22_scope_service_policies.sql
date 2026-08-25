-- ============================================================
-- service 전용 정책을 실제로 service_role 로 한정 — 익명 전체 접근 차단
-- ============================================================
--
-- 무엇이 문제였나
--   `*_service_all` / `*_service_only` 로 이름 붙은 정책들이 이렇게 선언돼 있었다.
--
--     CREATE POLICY "works_service_all" ON works FOR ALL
--       USING (true) WITH CHECK (true);        -- ← TO 절 없음
--
--   RLS 정책에서 `TO` 를 생략하면 **PUBLIC** 에 적용된다. 조건이 `true` 이므로
--   익명(anon) 을 포함한 모든 역할이 해당 테이블의 SELECT·INSERT·UPDATE·DELETE 를
--   통과한다. anon 은 테이블 권한(DELETE/INSERT/UPDATE/SELECT)도 이미 갖고 있고,
--   anon 키는 NEXT_PUBLIC_SUPABASE_ANON_KEY 로 브라우저 번들에 들어 있다.
--
--   즉 로그인하지 않은 누구나 아래 테이블 전체를 읽고 고치고 지울 수 있었다.
--   여기에는 로그인 시도 기록(admin_login_attempts), 신뢰 기기(admin_known_devices),
--   관리자 알림, 글 편집 이력 같은 것이 포함된다.
--
-- 고치는 방법
--   같은 정책을 `TO service_role` 로 다시 만든다. service_role 은 BYPASSRLS 라
--   정책이 없어도 통과하지만, 의도를 명시해 두는 편이 다음 사람에게 안전하다.
--
-- 영향
--   서버 API 는 service_role 로 접근하므로 동작이 달라지지 않는다.
--   공개 읽기(`*_public_read`)와 관리자 정책(`*_admin_*`)은 건드리지 않는다.
-- ============================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname AS pol
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE p.polroles = '{0}'                                    -- PUBLIC
      AND p.polcmd = '*'                                        -- FOR ALL
      AND pg_get_expr(p.polqual, p.polrelid) = 'true'           -- 조건 없음
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.pol, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      r.pol, r.tbl
    );
    RAISE NOTICE 'scoped to service_role: %.%', r.tbl, r.pol;
  END LOOP;
END $$;

-- ── 확인 ─────────────────────────────────────────────────────
-- 아래 쿼리가 0행이어야 한다 (PUBLIC + FOR ALL + 무조건 통과가 남아 있지 않음).
--
--   SELECT c.relname, p.polname
--   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
--   WHERE p.polroles = '{0}' AND p.polcmd = '*'
--     AND pg_get_expr(p.polqual, p.polrelid) = 'true';

SELECT log_migration_applied(
  '2026_08_22_scope_service_policies',
  'service 전용 정책에 TO service_role 부여 — TO 절 누락으로 anon 이 14개 테이블 전체를 읽고 쓸 수 있던 문제 차단'
);
