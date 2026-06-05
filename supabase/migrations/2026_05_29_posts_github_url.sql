-- posts 에 GitHub URL 컬럼 추가
-- setup.sql 에는 있지만 별도 migration 이 없어 기존 DB 에 누락됨

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS github_url text DEFAULT '';

-- PostgREST schema cache reload — 새 컬럼 즉시 인식
NOTIFY pgrst, 'reload schema';
