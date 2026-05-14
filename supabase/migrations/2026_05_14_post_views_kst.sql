-- ────────────────────────────────────────────────────────────────────────────
-- Migration: post_views — KST timezone + atomic dedup + race-free counter
--
-- 변경 사항
-- 1. viewed_date generated column 추가 (KST 기준 date)
-- 2. (post_id, ip, viewed_date) UNIQUE constraint — 동시 race 차단
-- 3. record_post_view(p_post_id, p_ip) RPC — dedup + insert + counter +1 atomic
-- 4. daily_post_views RPC — viewed_date 기반 group by (KST)
--
-- Supabase SQL Editor 에서 직접 실행 (idempotent).
-- ────────────────────────────────────────────────────────────────────────────

-- 1. generated column 추가 (이미 있으면 skip)
ALTER TABLE post_views
  ADD COLUMN IF NOT EXISTS viewed_date date
  GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'Asia/Seoul')::date) STORED;

-- 2. unique constraint — 기존 중복 데이터가 있으면 먼저 정리 필요할 수 있음.
-- 중복 정리 (가장 오래된 것만 남김):
DELETE FROM post_views a USING post_views b
WHERE a.id > b.id
  AND a.post_id = b.post_id
  AND a.ip = b.ip
  AND a.viewed_date = b.viewed_date;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_post_views_post_ip_date
  ON post_views (post_id, ip, viewed_date);

-- 기존 인덱스 정리 — 새 인덱스로 대체
DROP INDEX IF EXISTS idx_post_views_post_ip_viewed_at;
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_date
  ON post_views (viewed_date DESC);

-- 3. atomic 조회 기록 RPC
CREATE OR REPLACE FUNCTION record_post_view(p_post_id uuid, p_ip text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id AND deleted_at IS NULL) THEN
    RETURN false;
  END IF;

  INSERT INTO post_views (post_id, ip)
  VALUES (p_post_id, p_ip)
  ON CONFLICT (post_id, ip, viewed_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_post_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 4. daily_post_views — KST 기준 group by 로 변경
CREATE OR REPLACE FUNCTION daily_post_views(p_start date, p_end date)
RETURNS TABLE(day date, views bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT viewed_date AS day, COUNT(*)::bigint AS views
  FROM post_views
  WHERE viewed_date >= p_start AND viewed_date <= p_end
  GROUP BY viewed_date
  ORDER BY viewed_date ASC;
$$;
