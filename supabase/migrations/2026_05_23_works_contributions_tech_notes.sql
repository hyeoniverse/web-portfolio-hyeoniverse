-- works 에 작업 내용 (역할별) + 기술별 메모 필드 추가
-- 모두 jsonb default '{}' — 데이터 없으면 empty object
--
-- contributions_ko / contributions_en — 본인 역할별 작업 내용
--   { "Frontend": ["페이지 구현", "라우팅"], "Backend": ["API 작성"] }
--
-- tech_notes — 기술별 설명 (왜 사용했는지, 어떤 걸 구현했는지)
--   { "React": "컴포넌트 기반 UI", "TypeScript": "타입 안전성" }

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS contributions_ko jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contributions_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tech_notes jsonb NOT NULL DEFAULT '{}'::jsonb;
