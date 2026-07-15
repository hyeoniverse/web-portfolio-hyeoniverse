-- 게시물 제목 길이 제한 (UI input maxLength · API 검증과 동일 상한 = 120자)
-- title: NOT NULL 가정, title_en: NULL 허용.
-- 주의: 기존 행 중 120자 초과 제목이 있으면 ADD CONSTRAINT 가 실패한다. 먼저 확인/정리 필요:
--   SELECT id, char_length(title) FROM posts WHERE char_length(title) > 120;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_title_len') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_title_len CHECK (char_length(title) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_title_en_len') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_title_en_len CHECK (title_en IS NULL OR char_length(title_en) <= 120);
  END IF;
END $$;
