-- series_public_read 복구 — 방문자(anon)가 공개 시리즈를 읽지 못하던 문제 (#652)
--
-- 증상: 비로그인 세션에서 /api/series 목록이 빈 배열, /api/series/<id> 가 404.
--   /posts 시리즈 row 는 첫 렌더(SSR, service_role)엔 보였다가 정렬·필터를 바꾸면 비고,
--   글 상세의 시리즈 패널은 방문자에겐 아예 렌더되지 않았다.
-- 원인: 라이브 DB 의 series 에 anon 이 통과할 SELECT 정책이 없다. setup.sql 은
--   series_public_read(published = true) 를 정의하지만 라이브에는 없고(anon PostgREST 로
--   series 는 0행, posts·calendars 는 정상), 2026_08_22 RLS 마이그레이션은 series 에
--   series_member_all(authenticated + is_member()) 만 건다. 2026_08_25 revoke 마이그레이션의
--   주석은 *_public_read 가 범위를 정한다고 전제했다 — 그 전제를 실제 정책으로 맞춘다.
-- 범위: posts_public_read 와 같은 모양. published = true 인 시리즈만. 초안 시리즈는 계속 member 이상.

DROP POLICY IF EXISTS "series_public_read" ON public.series;
CREATE POLICY "series_public_read"
  ON public.series FOR SELECT
  USING (published = true);
