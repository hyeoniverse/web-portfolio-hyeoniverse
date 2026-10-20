-- 작업물 커버 위치/줌 저장 — 편집기 CoverBanner 의 세로 위치(object-position)·확대(scale) 를
-- 상세 화면 커버에 반영하기 위해 works 에 컬럼 추가. posts.cover_position / cover_zoom(2026_07_12) 미러.
-- 기존엔 작업물 편집기의 위치 조정이 로컬 상태라 저장되지 않았다.
-- cover_position: object-position 세로 % (0~100), cover_zoom: scale 배율 (1~2.5)
--
-- 적용 전에도 작업물 저장은 된다 — API 가 두 칸만 빼고 저장한다(lib/api/workCoverColumns).

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS cover_position real NOT NULL DEFAULT 50;
ALTER TABLE works
  ADD COLUMN IF NOT EXISTS cover_zoom real NOT NULL DEFAULT 1;

-- PostgREST 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
