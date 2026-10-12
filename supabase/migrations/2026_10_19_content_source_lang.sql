-- ============================================================================
-- 원문 언어 표시 · 원문 백업 (#1425)
-- ----------------------------------------------------------------------------
-- 사이트 기본 언어를 바꾸면 원문 칸(ko 자리)을 새 언어로 번역해 덮어쓴다.
--
-- posts.source_lang · works.source_lang : 원문 칸(ko)이 쓰인 언어. 비어 있으면 ko.
--   관리자가 편집 화면에 들어갈 때 이 값이 기본 언어와 다르면 그 글만 번역해 덮어쓴다.
-- content_translations.source_type 에 덮어쓰기 전 원문 백업을 더한다.
--   post_source · work_source : 글 · 작업물 한 건 × 덮어쓰기 전 언어 한 줄, fields = 원문 칸
--   settings_source           : 설정 글 · 프로필(고정 번호) × 언어 한 줄, fields = { 경로: 원문 }
-- ============================================================================

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_lang text;
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS source_lang text;

ALTER TABLE public.content_translations
  DROP CONSTRAINT IF EXISTS content_translations_source_type_check;
ALTER TABLE public.content_translations
  ADD CONSTRAINT content_translations_source_type_check
  CHECK (source_type IN ('post', 'work', 'ui', 'site_ui', 'post_meta', 'work_meta', 'series_meta', 'admin_text',
                         'post_source', 'work_source', 'settings_source'));

SELECT log_migration_applied(
  '2026_10_19_content_source_lang',
  '원문 언어(posts · works.source_lang)와 덮어쓰기 전 원문 백업(content_translations post_source · work_source · settings_source)'
);
