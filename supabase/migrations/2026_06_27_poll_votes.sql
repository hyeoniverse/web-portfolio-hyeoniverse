-- poll_votes — 본문 투표 블록 집계 (poll_id + option_id, IP 기반 중복 방지)
--   poll_id   : 에디터에서 블록 생성 시 부여하는 고정 id (저장 HTML data-poll-id)
--   option_id : 투표 옵션 고정 id (data-option-id)
--   단일 선택은 API 에서 (poll_id, ip) 기존 표를 지우고 다시 넣어 처리
--   복수 선택은 옵션별 토글(insert/delete)

CREATE TABLE IF NOT EXISTS poll_votes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id    text NOT NULL,
  option_id  text NOT NULL,
  ip         text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 같은 IP 가 같은 옵션에 중복 투표 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique
  ON poll_votes (poll_id, option_id, ip);

-- poll 단위 집계 조회용
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll
  ON poll_votes (poll_id);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- 누구나 집계 조회 가능
DROP POLICY IF EXISTS "poll_votes_public_read" ON poll_votes;
CREATE POLICY "poll_votes_public_read"
  ON poll_votes FOR SELECT
  USING (true);

-- service_role 전체 접근 (집계/투표는 admin client 로 처리)
DROP POLICY IF EXISTS "poll_votes_service_all" ON poll_votes;
CREATE POLICY "poll_votes_service_all"
  ON poll_votes FOR ALL
  USING (true)
  WITH CHECK (true);

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
