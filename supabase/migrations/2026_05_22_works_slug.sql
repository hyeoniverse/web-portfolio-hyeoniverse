-- ============================================================================
-- works.slug column 추가 — posts 와 동일 패턴.
-- URL 라우팅 /works/[id] → /works/[slug] 로 전환 위한 사전 작업.
-- ============================================================================

-- 1. slug column 추가 (NOT NULL DEFAULT '' — posts 와 일관)
ALTER TABLE works ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '';

-- 2. slug 검색 / 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_works_slug ON works (slug);

-- 3. SQL slugify — JS 의 generateSlug 와 동일 로직
--    a-z, 0-9, 한글, 공백, 하이픈만 남기고 공백 → 하이픈, 양 끝 하이픈 제거, 중복 하이픈 단일화, 80자 제한
CREATE OR REPLACE FUNCTION _sql_slugify(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE AS $$
DECLARE
  v text;
BEGIN
  v := lower(coalesce(t, ''));
  v := regexp_replace(v, '[^a-z0-9가-힣\s-]', '', 'g');
  v := regexp_replace(v, '\s+', '-', 'g');
  v := regexp_replace(v, '--+', '-', 'g');
  v := regexp_replace(v, '^-+|-+$', '', 'g');
  v := substring(v from 1 for 80);
  RETURN v;
END;
$$;

-- 4. 기존 works row 의 slug 자동 채우기 (slug 가 비어있는 경우만)
--    중복 시 -2, -3 suffix. ROW_NUMBER() OVER (PARTITION BY slugify(title)) 로 그룹별 순서.
--    title 이 모두 한글 외 특수문자라 slug 가 비어버리는 케이스 → id 첫 8자 fallback.
WITH numbered AS (
  SELECT
    id,
    _sql_slugify(title) AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY _sql_slugify(title) ORDER BY created_at NULLS LAST, id) AS rn
  FROM works
  WHERE COALESCE(slug, '') = ''
)
UPDATE works
SET slug = CASE
  WHEN n.base_slug = '' THEN substring(works.id::text from 1 for 8)
  WHEN n.rn = 1 THEN n.base_slug
  ELSE n.base_slug || '-' || n.rn
END
FROM numbered n
WHERE works.id = n.id;

-- 5. 확인 쿼리 (참고용):
--   SELECT id, title, slug FROM works LIMIT 20;
