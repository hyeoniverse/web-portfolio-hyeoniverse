-- ============================================================
-- service_role 전용 정책 제거 (전환 4단계)
-- ============================================================
--
-- 왜 지우나
--   service_role 은 BYPASSRLS 속성을 가진 역할이다. 정책이 있든 없든 모든 행을 통과한다.
--   즉 `*_service_all` / `*_service_only` 는 실행에 아무 영향이 없는 장식이다.
--
--   그런데 이 장식이 두 가지 해를 끼친다.
--
--   1) 정책 목록을 읽는 사람에게 "이 테이블은 커버돼 있다" 는 인상을 준다.
--      실제로는 authenticated 에 대한 규칙이 하나도 없을 수 있다.
--
--   2) 이 패턴 자체가 사고를 냈다. 원래 선언에 TO 절이 빠져 있었고
--      (2026_08_22_scope_service_policies 참고) TO 를 생략한 정책은 PUBLIC 에 적용된다.
--      조건이 USING (true) 였으므로 익명 사용자가 14개 테이블 전체를 읽고 쓸 수 있었다.
--      "USING (true) 로 전부 열어 두는 정책" 이라는 형태를 없애면 그 실수를 다시 못 한다.
--
-- 안전성
--   BYPASSRLS 가 실제로 붙어 있는지 먼저 확인하고, 아니면 예외를 던져 중단한다.
--   이 속성이 없는 상태에서 정책만 지우면 서버의 모든 DB 접근이 한 번에 끊긴다.
--
--   authenticated 용 정책(`*_admin_*` / `*_member_*` / `*_owner_*`)과 공개 읽기
--   (`*_public_read`)는 건드리지 않는다.
-- ============================================================

-- ── 1. 전제 확인 ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls
  ) THEN
    RAISE EXCEPTION
      'service_role 에 BYPASSRLS 가 없다. 이 상태에서 service 정책을 지우면 서버 접근이 전부 끊긴다. 중단한다.';
  END IF;
END $$;

-- ── 2. service_role 전용 무조건통과 정책 제거 ────────────────
DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname AS pol
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public'
      -- 대상 역할이 service_role 하나뿐인 정책만
      AND p.polroles = ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'service_role')]
      AND coalesce(pg_get_expr(p.polqual, p.polrelid), 'true') = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.pol, r.tbl);
    n := n + 1;
    RAISE NOTICE 'dropped %.%', r.tbl, r.pol;
  END LOOP;
  RAISE NOTICE '총 % 개 제거', n;
END $$;

-- ── 확인 ─────────────────────────────────────────────────────
-- 1) RLS 가 꺼진 public 테이블 — 있으면 안 된다 (정책과 무관하게 전부 열린다)
--   SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
--
-- 2) RLS 는 켜졌는데 정책이 하나도 없는 테이블 — service_role 만 접근 가능하다는 뜻.
--    의도한 것인지 표를 보고 판단할 것 (applied_migrations · admin_login_attempts 등은 정상)
--   SELECT c.relname, count(p.polname) AS policies
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   LEFT JOIN pg_policy p ON p.polrelid = c.oid
--   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
--   GROUP BY 1 ORDER BY 2, 1;
--
-- 3) PUBLIC 대상 정책이 남아 있는지 — published 조건이 붙은 공개 읽기만 남아야 한다
--   SELECT c.relname, p.polname, p.polcmd, pg_get_expr(p.polqual, p.polrelid)
--   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
--   WHERE p.polroles = '{0}' ORDER BY 1, 2;

SELECT log_migration_applied(
  '2026_08_25_drop_redundant_service_policies',
  'service_role 전용 무조건통과 정책 제거 — BYPASSRLS 라 평가되지 않는 장식이고, TO 절 누락 시 PUBLIC 이 되는 사고 패턴이었다. BYPASSRLS 확인 후 실행'
);
