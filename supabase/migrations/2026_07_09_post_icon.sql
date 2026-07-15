-- posts.icon — 페이지 아이콘(이모지 또는 이미지 URL). 커버 배너 상단에 표시.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '';
