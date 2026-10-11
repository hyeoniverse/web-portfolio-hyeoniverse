-- ============================================================================
-- content_translations.source_type 에 'ui' 추가 — 본문 안 라벨 번역 캐시
-- ----------------------------------------------------------------------------
-- 본문 안에 얹는 단추·안내 글(코드 블록의 복사·줄바꿈, 투표, 다이어그램 탭 …)은 글마다 같아서
-- 글/작업물 단위가 아니라 언어 단위로 한 줄만 둔다(src/lib/bodyLabels).
--
-- source_type : 'ui'
-- source_id   : 고정값 00000000-0000-0000-0000-000000000000 (UI_SOURCE_ID)
-- fields      : { ui: {열쇠 → 번역된 라벨}, v }
-- source_hash : 영어 라벨 묶음의 해시 — 라벨을 고치면 다음 요청이 다시 번역한다
-- ============================================================================

ALTER TABLE public.content_translations
  DROP CONSTRAINT IF EXISTS content_translations_source_type_check;
ALTER TABLE public.content_translations
  ADD CONSTRAINT content_translations_source_type_check CHECK (source_type IN ('post', 'work', 'ui'));

SELECT log_migration_applied(
  '2026_10_11_content_translations_ui',
  'content_translations.source_type 에 ui 추가 — 본문 안 라벨 번역 캐시 (언어마다 한 줄)'
);

-- 확인
--   SELECT lang, provider, updated_at FROM content_translations WHERE source_type = 'ui' ORDER BY updated_at DESC;
