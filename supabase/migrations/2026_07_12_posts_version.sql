-- posts.version — 낙관적 동시성 제어(optimistic concurrency)용 단조 증가 카운터.
-- 에디터 저장 시 로드 시점 version 을 baseVersion 으로 보내고, 서버는
--   UPDATE posts SET ..., version = baseVersion + 1 WHERE id = :id AND version = :baseVersion
-- 로 조건부 갱신. 0행이면 다른 기기/탭에서 이미 저장된 것 → 409 conflict.
-- view_count 등 다른 경로의 UPDATE 는 version 을 건드리지 않으므로 편집 충돌만 잡는다.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
