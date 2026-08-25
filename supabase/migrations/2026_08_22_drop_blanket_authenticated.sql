-- ============================================================
-- "Authenticated users have full access" 정책 제거
-- ============================================================
--
-- 무엇이 문제였나
--   posts 에 아래 정책이 걸려 있었다.
--     FOR ALL USING (auth.role() = 'authenticated')  · roles = PUBLIC
--
--   로그인만 하면 테이블 전체에 읽기·쓰기·삭제가 된다는 뜻이다. RLS 정책은 같은 명령에
--   대해 OR 로 합쳐지므로, 직전 마이그레이션에서 넣은 can_edit_post 검사가 이 정책 하나로
--   전부 무력화된다. 3단계 저자(자기 글만)가 세션 클라이언트로 남의 글을 지울 수 있다.
--
--   지금까지 드러나지 않은 이유는 코드가 service_role 로만 접근하고 API 가 검문했기
--   때문이다. 즉 "코드가 실수하지 않는다"에 기대고 있었고, 그 전제가 깨진 사례가
--   이미 있다(?all=true 로 비공개 글 전량 노출).
--
-- 안전성
--   브라우저에서 이 테이블들에 직접 접근하는 코드는 없다. 확인한 유일한 클라이언트 접근인
--   directUpload.ts 의 .from("posts") 는 테이블이 아니라 **storage 버킷**이라 무관하다.
--   서버 API 는 service_role 로 접근하며, service_role 은 BYPASSRLS 라 정책과 무관하게 통과한다.
--   따라서 이 정책을 지워도 현재 동작은 달라지지 않는다.
--
-- 남는 접근 경로
--   공개 읽기        — Published posts are viewable by everyone (published = true)
--   관리자           — posts_admin_* / works_admin_* (app_metadata 기반)
--   서버             — service_role (BYPASSRLS)
-- ============================================================

-- 이름이 환경마다 다를 수 있어 조건 없이 여러 후보를 정리한다(없으면 무시).
DROP POLICY IF EXISTS "Authenticated users have full access" ON posts;
DROP POLICY IF EXISTS "Authenticated users have full access" ON works;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON posts;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON works;

-- ── 확인 ─────────────────────────────────────────────────────
-- 아래 쿼리에 auth.role() = 'authenticated' 를 쓰는 행이 남아 있으면 안 된다.
--
--   SELECT polname,
--          pg_get_expr(polqual, polrelid)      AS using_expr,
--          pg_get_expr(polwithcheck, polrelid) AS check_expr
--   FROM pg_policy
--   WHERE polrelid IN ('posts'::regclass, 'works'::regclass)
--   ORDER BY polrelid::regclass::text, polname;

SELECT log_migration_applied(
  '2026_08_22_drop_blanket_authenticated',
  'posts/works 의 "Authenticated users have full access" 정책 제거 — 로그인만으로 전체 접근되던 구멍. 관리자 판정은 posts_admin_*/works_admin_* 가 담당'
);
