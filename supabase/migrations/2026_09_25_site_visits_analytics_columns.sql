-- 대시보드 트래픽 분석 확장(#1161) — site_visits 에 분석 컬럼 추가.
-- country: Vercel 의 x-vercel-ip-country 헤더 (ISO 3166-1 alpha-2, 로컬은 null)
-- path:    그날 첫 방문의 랜딩 경로 (querystring 제외)
-- utm_*:   랜딩 URL 의 UTM 파라미터 (링크 공유 채널 추적)
-- 적용 전에도 방문 기록이 끊기지 않도록 /api/visits 는 실패 시 기존 컬럼만으로 재시도한다.

alter table public.site_visits
  add column if not exists country text,
  add column if not exists path text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;
