-- comment_reactions — 댓글 이모지 반응 (giscus 식 고정 세트: 👍 👎 😄 🎉 😕 ❤️ 🚀 👀)
--   comment_type : 'post' | 'work'
--   reactor_hash : IP+UA 해시 (좋아요의 IP 방식과 동일 취지, 익명 식별)
--   같은 reactor 가 같은 (댓글, 이모지) 에 중복 반응하는 것 방지

CREATE TABLE IF NOT EXISTS comment_reactions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id   uuid NOT NULL,
  comment_type text NOT NULL CHECK (comment_type IN ('post', 'work')),
  emoji        text NOT NULL,
  reactor_hash text NOT NULL DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

-- 동일 reactor 가 같은 (댓글, 이모지) 에 중복 반응 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_reactions_unique
  ON comment_reactions (comment_id, comment_type, emoji, reactor_hash);

-- 댓글 단위 집계 조회용
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment
  ON comment_reactions (comment_id, comment_type);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- 누구나 반응 수 조회 가능
DROP POLICY IF EXISTS "comment_reactions_public_read" ON comment_reactions;
CREATE POLICY "comment_reactions_public_read"
  ON comment_reactions FOR SELECT
  USING (true);

-- service_role 전체 접근 (반응 토글은 admin client 로 처리)
DROP POLICY IF EXISTS "comment_reactions_service_all" ON comment_reactions;
CREATE POLICY "comment_reactions_service_all"
  ON comment_reactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
