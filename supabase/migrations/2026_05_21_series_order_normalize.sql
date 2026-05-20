-- ============================================================================
-- Series order 자동 정합화
-- ----------------------------------------------------------------------------
-- 목적:
--   posts.series_order 를 항상 0-based sequential (0, 1, 2, ...) 로 유지.
--   admin reorder / 글 삭제 / 시리즈 이동 / DB 직접 조작 등 어떤 경로로 변경되어도
--   해당 series 안의 모든 post 가 자동으로 재정렬됨.
--
-- 동작:
--   1. normalize_series_order(p_series_id) — 단일 series 정합화 (변경 있는 row 만 UPDATE)
--   2. trg_normalize_series_order() — INSERT/UPDATE/DELETE 후 관련 series 모두 정합화
--   3. pg_trigger_depth() 로 재귀 호출 차단 (normalize 안의 UPDATE 가 trigger 재발동해도 skip)
--   4. 마지막에 기존 데이터 일회성 normalize
-- ============================================================================

-- ── 1) Normalize function ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION normalize_series_order(p_series_id uuid)
RETURNS void AS $$
BEGIN
  IF p_series_id IS NULL THEN
    RETURN;
  END IF;

  WITH ranked AS (
    SELECT id,
           (ROW_NUMBER() OVER (
             ORDER BY series_order ASC, created_at ASC, id ASC
           ) - 1)::int AS new_order
    FROM posts
    WHERE series_id = p_series_id
  )
  UPDATE posts p
  SET series_order = r.new_order
  FROM ranked r
  WHERE p.id = r.id
    AND p.series_order IS DISTINCT FROM r.new_order;
END;
$$ LANGUAGE plpgsql;


-- ── 2) Trigger function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_normalize_series_order()
RETURNS TRIGGER AS $$
BEGIN
  -- 재귀 차단: normalize 안에서 발생한 UPDATE 가 trigger 다시 호출하면 skip
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  -- 신규 series_id (INSERT or UPDATE 후 series_id 가 있는 경우)
  IF TG_OP = 'INSERT' AND NEW.series_id IS NOT NULL THEN
    PERFORM normalize_series_order(NEW.series_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.series_id IS NOT NULL THEN
    PERFORM normalize_series_order(NEW.series_id);
  END IF;

  -- 떠난 series (UPDATE 시 series_id 변경 OR DELETE)
  IF TG_OP = 'UPDATE'
     AND OLD.series_id IS NOT NULL
     AND OLD.series_id IS DISTINCT FROM NEW.series_id THEN
    PERFORM normalize_series_order(OLD.series_id);
  ELSIF TG_OP = 'DELETE' AND OLD.series_id IS NOT NULL THEN
    PERFORM normalize_series_order(OLD.series_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- ── 3) Trigger ───────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS posts_normalize_series_order ON posts;
CREATE TRIGGER posts_normalize_series_order
AFTER INSERT OR UPDATE OF series_id, series_order OR DELETE
ON posts
FOR EACH ROW
EXECUTE FUNCTION trg_normalize_series_order();


-- ── 4) 기존 데이터 일회성 정합화 ─────────────────────────────────────────────
DO $$
DECLARE
  s_id uuid;
BEGIN
  FOR s_id IN
    SELECT DISTINCT series_id
    FROM posts
    WHERE series_id IS NOT NULL
  LOOP
    PERFORM normalize_series_order(s_id);
  END LOOP;
END $$;
