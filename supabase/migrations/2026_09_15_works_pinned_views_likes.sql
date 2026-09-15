-- ────────────────────────────────────────────────────────────────────────────
-- Migration: works 인기/핀 신호 — is_pinned · view_count · like_count
--            + work_views(시계열) + record_work_view RPC (posts 미러)
--
-- 목적: 홈 Selected Works 를 "핀 → 인기순 → 최신순" 으로 정렬한다.
--   인기 점수는 posts 와 동일(lib/popularity.ts):  score = view_count + like_count*3 + comments*5
--   works 에는 이 신호들이 없었다(posts 에는 다 있음). work 좋아요·댓글은 이미 존재.
--
-- Supabase SQL Editor 에서 직접 실행 (idempotent).
-- ────────────────────────────────────────────────────────────────────────────

-- 1. works 컬럼 추가 (posts 와 동형: setup.sql posts.is_pinned/view_count/like_count)
ALTER TABLE works
  ADD COLUMN IF NOT EXISTS is_pinned  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count int     NOT NULL DEFAULT 0;

-- 2. work_views — work 별 일별 조회수 (시계열). post_views 미러.
--    viewed_date = KST(Asia/Seoul) 날짜 — dedup 경계 + 일별 group by 통일.
CREATE TABLE IF NOT EXISTS work_views (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id     uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  ip          text,
  viewed_at   timestamptz NOT NULL DEFAULT now(),
  viewed_date date GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'Asia/Seoul')::date) STORED
);

-- (work_id, ip, viewed_date) UNIQUE — 동시 race 차단 + 하루 1회 dedup
CREATE UNIQUE INDEX IF NOT EXISTS uniq_work_views_work_ip_date
  ON work_views (work_id, ip, viewed_date);
CREATE INDEX IF NOT EXISTS idx_work_views_viewed_date
  ON work_views (viewed_date DESC);

-- RLS — post_views 와 동일: 공개 정책 없음(모든 접근은 서버 service_role 경유)
ALTER TABLE work_views ENABLE ROW LEVEL SECURITY;

-- 3. atomic 조회 기록 RPC (record_post_view 미러)
--    dedup + insert + works.view_count +1 을 (work_id, ip, viewed_date) UNIQUE 로 race-free.
CREATE OR REPLACE FUNCTION record_work_view(p_work_id uuid, p_ip text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM works WHERE id = p_work_id AND deleted_at IS NULL) THEN
    RETURN false;
  END IF;

  INSERT INTO work_views (work_id, ip)
  VALUES (p_work_id, p_ip)
  ON CONFLICT (work_id, ip, viewed_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    UPDATE works SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_work_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 4. 기존 work 좋아요를 like_count 로 백필 (likes.target_type='work', target_id=works.id::text)
UPDATE works w
SET like_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT target_id, COUNT(*)::int AS cnt
  FROM likes
  WHERE target_type = 'work'
  GROUP BY target_id
) sub
WHERE w.id::text = sub.target_id;
