-- 작업물의 게시물형 칸 삭제 — 작업물은 랜딩 하나로 (2/2)
--
-- 작업물 상세는 이제 랜딩(works.landing)으로만 그린다. 본문 · 갤러리 · 팀원 · 기여 · 기술 설명 · AI 요약 같은
-- 긴 기록은 posts 의 '프로젝트' 템플릿 글로 쓴다. 그래서 아래 칸은 읽는 곳이 없다:
--   content_ko/en · content_type · overview/challenge/solution_* · team_members · contributions_ko/en · tech_notes
--   gallery · gallery_notes · summary_ko/en · icon · cover_position · cover_zoom
-- 작업물에 관련 시리즈를 붙이던 series_work_relations 도 지운다(글 ↔ 작업물 post_work_relations 는 남는다).
--
-- 순서: 2026_10_24_b_works_author_ids.sql 을 먼저, 이 파일은 새 코드를 배포한 뒤에 적용한다 —
-- 옛 코드는 이 칸들을 읽는다. 지운 칸은 되돌릴 수 없다.

-- 쓰지 않는 칸 지우기
ALTER TABLE public.works
  DROP COLUMN IF EXISTS content_ko,
  DROP COLUMN IF EXISTS content_en,
  DROP COLUMN IF EXISTS content_type,
  DROP COLUMN IF EXISTS overview_ko,
  DROP COLUMN IF EXISTS overview_en,
  DROP COLUMN IF EXISTS overview_image,
  DROP COLUMN IF EXISTS challenge_ko,
  DROP COLUMN IF EXISTS challenge_en,
  DROP COLUMN IF EXISTS challenge_image,
  DROP COLUMN IF EXISTS solution_ko,
  DROP COLUMN IF EXISTS solution_en,
  DROP COLUMN IF EXISTS solution_image,
  DROP COLUMN IF EXISTS team_members,
  DROP COLUMN IF EXISTS contributions_ko,
  DROP COLUMN IF EXISTS contributions_en,
  DROP COLUMN IF EXISTS tech_notes,
  DROP COLUMN IF EXISTS gallery,
  DROP COLUMN IF EXISTS gallery_notes,
  DROP COLUMN IF EXISTS summary_ko,
  DROP COLUMN IF EXISTS summary_en,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS cover_position,
  DROP COLUMN IF EXISTS cover_zoom;

-- 작업물 ↔ 시리즈 연결 표
DROP TABLE IF EXISTS public.series_work_relations;

SELECT log_migration_applied('2026_10_24_c_works_drop_post_columns', '작업물은 랜딩 하나로 — 게시물형 칸 · series_work_relations 삭제');

NOTIFY pgrst, 'reload schema';
