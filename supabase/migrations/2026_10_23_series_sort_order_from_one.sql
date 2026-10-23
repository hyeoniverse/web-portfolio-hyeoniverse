-- 시리즈 순번을 1부터 — 기본값(0)으로 들어간 시리즈가 관리 화면에 #0 으로 보였다.
-- 지금 순서(sort_order, 같으면 최신 먼저 — 목록 기본 정렬과 같다)를 그대로 두고 1, 2, 3… 으로 다시 매긴다.
-- 1 미만인 행이 하나라도 있을 때만 바꾼다. 여러 번 실행해도 결과가 같다.

UPDATE public.series AS s
SET sort_order = r.n
FROM (
  SELECT id, row_number() OVER (ORDER BY sort_order ASC, created_at DESC) AS n
  FROM public.series
) AS r
WHERE s.id = r.id
  AND EXISTS (SELECT 1 FROM public.series WHERE sort_order < 1);
