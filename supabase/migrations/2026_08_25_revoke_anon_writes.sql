-- ============================================================
-- 익명 역할의 쓰기 권한 회수 (심층 방어)
-- ============================================================
--
-- 배경
--   Supabase 는 기본으로 public 스키마의 모든 테이블에 anon·authenticated 앞으로
--   GRANT ALL 을 걸어 둔다. 그래서 anon 이 SELECT 뿐 아니라 INSERT·UPDATE·DELETE·TRUNCATE
--   까지 갖고 있다. anon 키는 NEXT_PUBLIC_SUPABASE_ANON_KEY 로 브라우저 번들에 들어 있다.
--
--   지금은 RLS 가 막고 있지만, 이 프로젝트에서 실제로 정책 하나가 잘못 적혀
--   (TO 절 누락 → PUBLIC + USING(true)) 14개 테이블이 익명에게 열린 적이 있다.
--   정책이 마지막 방어선이면 정책을 한 번 잘못 쓰는 순간 전부 뚫린다.
--
--   GRANT 를 회수해 두면 정책이 잘못돼도 익명은 쓰기 자체를 시도할 수 없다.
--
-- 안전성 — 확인한 사실
--   브라우저는 테이블에 직접 쓰지 않는다. 클라이언트 Supabase 사용처는 셋뿐이다.
--     · auth (로그인/세션)
--     · Realtime (usePostPresence · AdminAuthSync 의 broadcast 채널)
--     · storage 버킷 "posts" (directUpload) — public 스키마가 아니라 storage 스키마다
--   댓글·좋아요·투표·방문기록 같은 공개 쓰기는 전부 서버 API 가 service_role 로 처리한다.
--
--   SELECT 는 남긴다. 공개 목록/상세가 세션 없는 요청에서 anon 클라이언트로 읽고
--   (posts·series·works·calendars) *_public_read 정책이 범위를 정한다.
-- ============================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

/* 익명 INSERT 를 허용하던 정책들도 함께 지운다. 셋 다 실제로는 쓰이지 않는다 —
   댓글은 commentHandler 가 adminDb(service_role)로 넣고, 조회수도 서버 라우트가 넣는다.
   GRANT 를 회수한 뒤에는 통과할 수 없는 정책이라, 남겨 두면 "익명이 쓸 수 있다" 는
   잘못된 인상만 준다. 나중에 브라우저에서 직접 쓰게 하려면 GRANT 와 함께 되살려야 한다. */
DROP POLICY IF EXISTS "comments_public_insert"      ON comments;
DROP POLICY IF EXISTS "work_comments_public_insert" ON work_comments;
DROP POLICY IF EXISTS "post_views_public_insert"    ON post_views;

-- 앞으로 만들어지는 테이블에도 같은 규칙이 적용되도록 기본 권한을 바꾼다.
-- (이 문을 실행한 역할이 만드는 객체에 적용된다 — 보통 postgres)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;

-- ── 확인 ─────────────────────────────────────────────────────
-- 1) anon 에 SELECT 만 남아야 한다 (REFERENCES·TRIGGER 는 무해하므로 남아도 됨)
--   SELECT privilege_type, count(*) AS tables
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'anon' AND table_schema = 'public'
--   GROUP BY 1 ORDER BY 1;
--
-- 2) authenticated 는 그대로여야 한다 (2단계에서 세션 클라이언트가 쓰기를 한다)
--   SELECT privilege_type, count(*) AS tables
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'authenticated' AND table_schema = 'public'
--   GROUP BY 1 ORDER BY 1;
--
-- 3) 사이트에서 확인할 것 — 비로그인 상태로
--    글 목록/상세, 시리즈, 작업물, 달력 블록이 보이는지
--    댓글 작성, 좋아요, 투표가 되는지 (서버 API 경유라 영향 없어야 한다)

SELECT log_migration_applied(
  '2026_08_25_revoke_anon_writes',
  'anon 의 INSERT/UPDATE/DELETE/TRUNCATE 회수 (SELECT 유지) — 정책이 잘못돼도 익명이 쓰지 못하도록. 브라우저는 테이블에 직접 쓰지 않음(auth·Realtime·storage 만 사용)'
);
