-- works.title_en — 작품 제목 영문 (title = 국문/기본).
-- 리더뷰는 방문자 언어에 따라 title / title_en 선택(빈 쪽은 반대 언어로 fallback).
ALTER TABLE works ADD COLUMN IF NOT EXISTS title_en text NOT NULL DEFAULT '';

SELECT log_migration_applied('2026_07_18_works_title_en', 'works.title_en — 작품 제목 영문 (title 이중언어화)');
