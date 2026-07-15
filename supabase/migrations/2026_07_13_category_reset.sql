-- ════════════════════════════════════════════════════════════════════════
-- 카테고리 기본값 재설정
--   새 기본 카테고리: 개발 · 학습(└ 알고리즘 · CS) · 인사이트 · 회고 · 일상 · 기타
--   posts.category / series.category 엔 leaf 값만 저장. '학습'은 소분류 컨테이너(직접 배정 X).
-- ⚠️ 수동 실행 전용. 위에서부터 순서대로, 각 UPDATE 전에 [0] 으로 현재 값 확인 권장.
--    되돌리기 어려우니 실행 전 백업(pg_dump 또는 스냅샷) 권장.
-- ════════════════════════════════════════════════════════════════════════

-- [0] 현재 글/시리즈 카테고리 분포 — 아래 매핑 CASE 에 안 걸리는 값이 있으면 전부 '기타'로 쓸려가니 먼저 확인
SELECT 'posts'  AS tbl, category, COUNT(*) FROM posts  GROUP BY category
UNION ALL
SELECT 'series' AS tbl, category, COUNT(*) FROM series GROUP BY category
ORDER BY 1, 3 DESC;

-- [1] site_settings 의 카테고리 오버라이드 제거 → config 시드(새 기본 카테고리)가 그대로 적용됨.
--     delta 래퍼/비래퍼 두 위치 모두 안전 제거 ( #- 는 없는 경로면 무시 ).
UPDATE site_settings
SET config = (config #- '{delta,posts,categories}') #- '{posts,categories}',
    updated_at = now()
WHERE id = 'default';

-- [2] 게시물 카테고리 재배치 (옛 ko/en 값 → 새 leaf 값). 미매핑은 '기타'.
--     '인사이트'는 옛 소스가 없어 자동 배정 대상 아님 → 필요한 글만 이후 수동 지정.
UPDATE posts
SET category = CASE
  WHEN category IN ('프론트엔드','Frontend','백엔드','Backend','DevOps',
                    '도구·생산성','Tools & Productivity','개발','Development') THEN '개발'
  WHEN category IN ('알고리즘','Algorithm')  THEN '알고리즘'
  WHEN category IN ('CS')                    THEN 'CS'
  WHEN category IN ('회고','Retrospective')  THEN '회고'
  WHEN category IN ('일상','Life')           THEN '일상'
  WHEN category IN ('기타','Etc')            THEN '기타'
  ELSE '기타'  -- 기초/기록/빈값 등 미매핑 → 기타
END;

-- [3] 시리즈 카테고리도 동일 규칙으로 재배치
UPDATE series
SET category = CASE
  WHEN category IN ('프론트엔드','Frontend','백엔드','Backend','DevOps',
                    '도구·생산성','Tools & Productivity','개발','Development') THEN '개발'
  WHEN category IN ('알고리즘','Algorithm')  THEN '알고리즘'
  WHEN category IN ('CS')                    THEN 'CS'
  WHEN category IN ('회고','Retrospective')  THEN '회고'
  WHEN category IN ('일상','Life')           THEN '일상'
  WHEN category IN ('기타','Etc')            THEN '기타'
  ELSE '기타'
END;

-- [4] 결과 확인 — 개발/알고리즘/CS/인사이트/회고/일상/기타 값만 남아야 함
SELECT 'posts'  AS tbl, category, COUNT(*) FROM posts  GROUP BY category
UNION ALL
SELECT 'series' AS tbl, category, COUNT(*) FROM series GROUP BY category
ORDER BY 1, 3 DESC;
