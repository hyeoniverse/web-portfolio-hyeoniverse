-- 커버 이미지 위치/줌 저장 — 편집기 CoverBanner 의 세로 위치(object-position)·확대(scale) 를
-- 리더뷰에 반영하기 위해 posts 에 컬럼 추가. (기존엔 로컬 상태라 저장 안 됨)
-- cover_position: object-position 세로 % (0~100), cover_zoom: scale 배율 (1~2.5)

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS cover_position real NOT NULL DEFAULT 50;
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS cover_zoom real NOT NULL DEFAULT 1;

-- PostgREST 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
