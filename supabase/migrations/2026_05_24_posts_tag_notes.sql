-- posts 에 태그별 설명 필드 추가
-- works.tech_notes 와 동일 패턴 — { "react": ["why I chose it", "details"], "typescript": [...] }

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tag_notes jsonb NOT NULL DEFAULT '{}'::jsonb;
