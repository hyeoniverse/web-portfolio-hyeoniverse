-- works.nature_ko / nature_en — "성격" 축 (실무 / 사이드 / 토이 / 클론 코딩 / 학습 / 기타 등).
-- 기존 category 는 결과물 형태(웹앱·라이브러리 등) 를 나타내고, nature 는 제작 동기를 나타냄.
-- 기본값은 빈 문자열 (미지정). 후속 마이그레이션에서 backfill 또는 admin 에서 직접 입력.

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS nature_ko text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nature_en text NOT NULL DEFAULT '';

-- 필터링/groupby 용 인덱스 (작은 카디널리티 — btree 면 충분)
CREATE INDEX IF NOT EXISTS idx_works_nature_ko ON works (nature_ko);
