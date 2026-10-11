-- ============================================================================
-- content_translations.source_type 에 사이트 전체 번역 종류 추가
-- ----------------------------------------------------------------------------
-- "다른 언어로 보기"를 상세 화면 밖(내비게이션 · 목록 · 화면 글)으로 넓힌다.
--
-- site_ui     : 방문자 화면 글(locales/en.json) 전체의 번역 — 언어마다 한 줄
--               source_id 는 고정값 00000000-0000-0000-0000-000000000000
--               fields = { strings: {점 열쇠 → 번역} }, source_hash = 영어 사전 묶음의 해시(siteUiHash)
-- post_meta   : 목록 카드의 글 제목 · 요약 — 글 × 언어
-- work_meta   : 목록 카드의 작업물 제목 · 부제목 · 설명 — 작업물 × 언어
-- series_meta : 시리즈 카드의 제목 · 설명 — 시리즈 × 언어
--               본문까지 담는 상세의 줄('post' · 'work')과 따로 둔다 — 목록을 보이려고 본문을 번역하지 않게.
-- ============================================================================

ALTER TABLE public.content_translations
  DROP CONSTRAINT IF EXISTS content_translations_source_type_check;
ALTER TABLE public.content_translations
  ADD CONSTRAINT content_translations_source_type_check
  CHECK (source_type IN ('post', 'work', 'ui', 'site_ui', 'post_meta', 'work_meta', 'series_meta'));

SELECT log_migration_applied(
  '2026_10_12_content_translations_site',
  'content_translations.source_type 에 site_ui · post_meta · work_meta · series_meta 추가 — 사이트 전체 번역 캐시'
);

-- 확인
--   SELECT source_type, lang, count(*) FROM content_translations GROUP BY 1, 2 ORDER BY 1, 2;
