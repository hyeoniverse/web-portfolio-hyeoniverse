-- ============================================================
-- 익명 직접 접근 차단 — 댓글 민감 컬럼 노출 · 좋아요 임의 삭제
-- ============================================================
--
-- 확인한 사실
--   이 프로젝트에서 브라우저는 테이블에 직접 붙지 않는다. 공개 페이지의 글 조회
--   (lib/posts.ts), 댓글 조회(api/comments), 좋아요 토글(lib/api/likeHandler.ts)이
--   모두 서버에서 service_role 로 이뤄진다. 클라이언트 Supabase 는 storage 업로드와
--   Realtime 구독에만 쓴다.
--
--   따라서 아래 정책들은 실제로 쓰이지 않으면서 위험만 남긴다.
--
-- 무엇이 문제였나
--   1) comments / work_comments 의 `USING (true)` SELECT
--      API 는 삭제된 댓글의 content 와 commenter_hash 를 비워서 응답한다(tombstone).
--      그런데 테이블을 직접 읽으면 그 처리를 건너뛴다. 삭제된 댓글 본문이 그대로 나오고,
--      password_hash(bcrypt) 와 notify_email 까지 함께 조회된다.
--
--   2) likes 의 `Allow public delete` — USING (true)
--      조건이 없어 누구나 남의 좋아요를 지울 수 있다. 좋아요 취소는 서버가
--      IP 로 본인 것을 찾아 지우므로(likeHandler) 이 정책은 필요 없다.
--
-- 영향
--   서버는 service_role(BYPASSRLS)로 접근하므로 동작이 달라지지 않는다.
--   posts / works 의 공개 읽기(published = true)는 그대로 둔다 — 의도된 공개 범위이고
--   민감 컬럼이 없다.
-- ============================================================

-- ── 1. 댓글 테이블의 무조건 공개 읽기 제거 ───────────────────
-- 이름이 환경마다 달라 조건으로 찾아 지운다.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname AS pol
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname IN ('comments', 'work_comments')
      AND p.polroles = '{0}'                                -- PUBLIC
      AND p.polcmd = 'r'                                    -- SELECT
      AND pg_get_expr(p.polqual, p.polrelid) = 'true'       -- 조건 없음
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.pol, r.tbl);
    RAISE NOTICE 'dropped public read: %.%', r.tbl, r.pol;
  END LOOP;
END $$;

-- ── 2. 좋아요 임의 삭제 제거 ─────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.polname AS pol
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'likes'
      AND p.polroles = '{0}'
      AND p.polcmd = 'd'                                    -- DELETE
      AND pg_get_expr(p.polqual, p.polrelid) = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.likes', r.pol);
    RAISE NOTICE 'dropped public delete: likes.%', r.pol;
  END LOOP;
END $$;


-- ── 3. 개인정보가 담긴 테이블의 무조건 공개 읽기 제거 ────────
--   likes.ip · poll_votes.ip · site_visits.ip/user_agent/referrer 는 방문자 식별 정보다.
--   comment_reactions.reactor_hash 는 IP+UA 해시로, 같은 사람의 활동을 이어붙일 수 있다.
--   집계는 모두 서버가 하므로(대시보드·좋아요 수) 익명 직접 조회가 필요 없다.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, p.polname AS pol
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname IN ('likes', 'poll_votes', 'site_visits', 'comment_reactions')
      AND p.polroles = '{0}'
      AND p.polcmd = 'r'
      AND pg_get_expr(p.polqual, p.polrelid) = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.pol, r.tbl);
    RAISE NOTICE 'dropped public read: %.%', r.tbl, r.pol;
  END LOOP;
END $$;

-- ── 4. site_settings 공개 읽기 제거 ──────────────────────────
--   config(jsonb) 에 사이트 설정 전체가 들어 있다. 공개 페이지도 서버에서 읽으므로
--   익명 직접 조회는 필요 없다.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.polname AS pol
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    WHERE c.relname = 'site_settings'
      AND p.polroles = '{0}'
      AND p.polcmd = 'r'
      AND pg_get_expr(p.polqual, p.polrelid) = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.site_settings', r.pol);
    RAISE NOTICE 'dropped public read: site_settings.%', r.pol;
  END LOOP;
END $$;

-- ── 확인 ─────────────────────────────────────────────────────
--   -- 댓글 테이블에 PUBLIC SELECT 가 남아 있지 않아야 한다
--   SELECT c.relname, p.polname, pg_get_expr(p.polqual, p.polrelid)
--   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
--   WHERE c.relname IN ('comments','work_comments','likes') AND p.polroles = '{0}';
--
--   -- 사이트에서 확인할 것: 글 상세의 댓글 목록, 좋아요 토글

SELECT log_migration_applied(
  '2026_08_22_close_public_table_reads',
  '익명 직접 접근 차단 — comments/work_comments 공개 SELECT(삭제 본문·password_hash), likes 공개 DELETE, IP 보유 테이블(likes·poll_votes·site_visits·comment_reactions) 공개 SELECT, site_settings 공개 SELECT 제거. 모든 조회는 서버 service_role 경유'
);
