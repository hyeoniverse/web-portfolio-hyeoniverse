-- posts.author_ids — 작성자 id 배열 (site.config authors 의 id 참조).
-- 비어있으면 리더뷰에서 기본 작성자(authors 목록 첫 항목)로 표시.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_ids text[] NOT NULL DEFAULT '{}';
