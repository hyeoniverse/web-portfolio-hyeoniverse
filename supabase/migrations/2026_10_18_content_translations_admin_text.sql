-- ============================================================================
-- content_translations.source_type 에 admin_text 추가
-- ----------------------------------------------------------------------------
-- 관리자 화면을 다른 언어로 볼 때(#1405), 사전에 없는 정해진 시스템 글(알림 제목 · 본문)도 번역한다.
--
-- admin_text : 글 하나 × 언어 한 줄
--              source_id = 원문 sha256 앞 32자리로 만든 uuid, source_hash = 같은 해시
--              fields = { text: 번역 }
-- ============================================================================

ALTER TABLE public.content_translations
  DROP CONSTRAINT IF EXISTS content_translations_source_type_check;
ALTER TABLE public.content_translations
  ADD CONSTRAINT content_translations_source_type_check
  CHECK (source_type IN ('post', 'work', 'ui', 'site_ui', 'post_meta', 'work_meta', 'series_meta', 'admin_text'));

SELECT log_migration_applied(
  '2026_10_18_content_translations_admin_text',
  'content_translations.source_type 에 admin_text 추가 — 관리자 화면 알림 등 시스템 글 번역 캐시'
);
