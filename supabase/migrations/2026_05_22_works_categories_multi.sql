-- works.category_ko/en (단일 string) → categories_ko/en (text[]) 로 전환.
-- 하나의 work 가 여러 형태/결과물 카테고리 (웹앱 + 라이브러리 등) 를 가질 수 있게 함.

-- 1) 새 배열 컬럼 추가
ALTER TABLE works
  ADD COLUMN IF NOT EXISTS categories_ko text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS categories_en text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 2) 기존 단일 값을 배열로 이관 (이미 배열에 값이 있으면 skip)
UPDATE works
SET categories_ko = CASE
      WHEN COALESCE(category_ko, '') != '' THEN ARRAY[category_ko]
      ELSE ARRAY[]::text[]
    END,
    categories_en = CASE
      WHEN COALESCE(category_en, '') != '' THEN ARRAY[category_en]
      ELSE ARRAY[]::text[]
    END
WHERE COALESCE(array_length(categories_ko, 1), 0) = 0;

-- 3) array containment 필터 (?category=foo → categories_ko @> ARRAY['foo']) 용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_works_categories_ko_gin ON works USING GIN (categories_ko);
CREATE INDEX IF NOT EXISTS idx_works_categories_en_gin ON works USING GIN (categories_en);

-- 4) 단일 컬럼 제거 (사용처 코드도 함께 이관 완료 가정)
ALTER TABLE works
  DROP COLUMN IF EXISTS category_ko,
  DROP COLUMN IF EXISTS category_en;
