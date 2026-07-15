-- 달력 휴지통(소프트 삭제) + 30일 자동 영구삭제 — posts/works 컨벤션 동일.
-- 삭제 = deleted_at/purge_after 세팅(soft), 복구 = deleted_at null, 30일 후 cron 이 hard delete.

ALTER TABLE calendars
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT NULL;
ALTER TABLE calendars
  ADD COLUMN IF NOT EXISTS purge_after timestamptz DEFAULT NULL;

-- purge cron 스캔용 — deleted_at IS NOT NULL 인 row 만 인덱스
CREATE INDEX IF NOT EXISTS calendars_purge_after_idx
  ON calendars (purge_after) WHERE deleted_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
