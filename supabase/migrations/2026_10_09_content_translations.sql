-- ============================================================================
-- content_translations — 글·작업물 상세의 "다른 언어로 읽기" 번역 캐시
-- ----------------------------------------------------------------------------
-- ko · en 은 posts/works 의 칸(title_en, content_en …)에 저장한다. 그 밖의 언어(일본어·독일어 …)는
-- 언어마다 칸을 늘릴 수 없어 이 표에 한 줄(글/작업물 × 언어)로 둔다.
--
-- source_type : 'post' | 'work'
-- source_id   : posts.id / works.id — 두 표를 가리켜 외래 키는 두지 않는다(원본이 지워지면 줄만 남고 읽히지 않는다)
-- lang        : lib/translationLanguages 의 코드(ja, de, zh-Hans, pt-BR …)
-- fields      : 번역된 칸 {title, excerpt?, subtitle?, description?, content}
-- source_hash : 번역할 때 쓴 원문 칸들의 해시 — 원문이 바뀌면 달라져 다음 요청이 다시 번역한다
-- provider    : 번역한 공급자 체인(첫 공급자 이름) — 기록용
--
-- 서버(service_role)만 읽고 쓴다 — 공개 API(/api/content-translate)가 admin 클라이언트로 읽는다.
-- RLS 를 켜고 정책은 두지 않는다(service_logs 와 같다).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_translations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('post', 'work')),
  source_id   uuid NOT NULL,
  lang        text NOT NULL,
  fields      jsonb NOT NULL DEFAULT '{}',
  source_hash text NOT NULL,
  provider    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, lang)
);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_translations FROM anon, authenticated;

SELECT log_migration_applied(
  '2026_10_09_content_translations',
  'content_translations — 상세 화면 다른 언어 번역 캐시 (service_role 전용)'
);

-- 확인
--   SELECT source_type, source_id, lang, provider, updated_at FROM content_translations ORDER BY updated_at DESC LIMIT 20;
