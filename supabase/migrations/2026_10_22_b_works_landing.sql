-- 작업물 랜딩 페이지 내용 — 설정의 '작업물 상세 화면'을 랜딩 페이지로 고르면 상세가 이 내용으로 그려진다.
-- 언어별 jsonb: { eyebrow, media[{ src?, demo?, size: "inset" | "full" }] } (src/types/workLanding.ts)
-- 글 없이 그림 위주 — 미디어를 비우면 갤러리 그림으로 채운다.
--
-- 적용 전에도 작업물 저장은 된다 — API 가 두 칸만 빼고 저장한다(lib/api/workLandingColumns).

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS landing_ko jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE works
  ADD COLUMN IF NOT EXISTS landing_en jsonb NOT NULL DEFAULT '{}'::jsonb;

-- PostgREST 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
