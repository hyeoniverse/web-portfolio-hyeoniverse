-- ────────────────────────────────────────────────────────────
-- posts / works 휴지통 자동 영구삭제 (TTL) — purge_after timestamptz
-- ────────────────────────────────────────────────────────────
-- soft-delete 시 set, cron /api/cron/purge-trash 가 매일 1회
-- purge_after < NOW() 인 row 들 hard delete.
-- 인기글 (view_count >= 100 OR like_count >= 10) 은 더 긴 기간 (90일),
-- 일반은 30일.
-- 사용자가 "보관 연장" 버튼 누르면 purge_after += 30일.
-- NULL = TTL 없음 (기존 soft-deleted row 마이그레이션 시 보호).

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

-- 빠른 cron 스캔용 — deleted_at IS NOT NULL + purge_after 정렬
CREATE INDEX IF NOT EXISTS posts_purge_after_idx
  ON posts (purge_after) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS works_purge_after_idx
  ON works (purge_after) WHERE deleted_at IS NOT NULL;
