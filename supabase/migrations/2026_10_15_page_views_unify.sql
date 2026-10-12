-- ============================================================================
-- page_views 로 조회 기록 통일 — 1단계: 칸 추가 · 옛 기록 복사 · 함수 교체 (#1399)
-- ----------------------------------------------------------------------------
-- 같은 방문을 세 군데에 따로 적고 있었다 — site_visits(IP·하루 1행, 유입 · 기기 · 국가 · UTM),
-- post_views / work_views(글 · 작업물 IP·하루 1회), page_views(페이지 조회 30분 1회). 기준이 달라 푸터 · 대시보드 ·
-- 글 조회수가 서로 맞지 않았다. 원본을 page_views 하나로 두고 나머지 숫자는 전부 여기서 센다.
--
--   방문(세션)      session_id — 30분 동안 아무것도 안 보면 새 방문. 방문의 첫 조회가 is_landing
--   방문자          visitor_id — 브라우저에 남는 임의 값(신규 · 재방문). IP 는 90일 뒤 지워져 판정이 끊겼다
--   유입 · 기기 · 국가 · UTM   첫 조회 줄에만 담는다. 기기(device_kind)는 봇을 가르려고 모든 줄에 담는다
--   글 · 작업물 조회수   record_page_view 가 /posts/{slug} · /works/{slug} 의 새 조회일 때 view_count 를 +1 (봇 제외)
--
-- 옛 기록 복사(_migrate_legacy_views) — 여러 번 돌려도 같은 결과(legacy_id 로 이미 옮긴 줄을 건너뛴다):
--   post_views → /posts/{slug},  work_views → /works/{slug}  (시각 · IP 그대로)
--   site_visits → 방문의 첫 조회. 랜딩 경로가 같은 날 같은 IP 의 글 · 작업물 조회와 같으면 그 줄에 방문 정보를 붙이고,
--                 아니면 새 줄(경로를 모르면 비움 · 시각은 그날 0시 KST — 시간대 히트맵에서는 뺀다)
--   세션은 옛 방문 하나(IP · 날짜)마다 하나, 방문자는 IP 마다 하나(익명화된 줄은 줄마다). 머문 시간은 없다.
--   옛 방문 수는 site_visits 만으로 정한다 — 글 · 작업물 조회만 있는 날은 첫 조회 줄을 만들지 않는다(IP 가 익명화돼
--   방문과 맞춰 볼 수 없는 줄이 많아, 첫 조회로 세면 옛 방문 수가 부풀었다). 그래서 옮긴 뒤 방문 수 = 옛 site_visits 수.
--
-- 적용 순서: 이 파일(1단계) → 새 코드 배포 → 2026_10_16_drop_legacy_views.sql(2단계, 남은 줄 복사 후 옛 테이블 삭제).
-- 이 단계에서는 옛 테이블을 지우지 않는다 — 배포 전까지 지금 코드가 계속 읽고 쓴다.
-- ============================================================================

ALTER TABLE public.page_views ALTER COLUMN path DROP NOT NULL;
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS visitor_id    text,
  ADD COLUMN IF NOT EXISTS is_landing    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referrer      text,
  ADD COLUMN IF NOT EXISTS user_agent    text,
  ADD COLUMN IF NOT EXISTS device_kind   text,
  ADD COLUMN IF NOT EXISTS os            text,
  ADD COLUMN IF NOT EXISTS browser       text,
  ADD COLUMN IF NOT EXISTS device_model  text,
  ADD COLUMN IF NOT EXISTS country       text,
  ADD COLUMN IF NOT EXISTS utm_source    text,
  ADD COLUMN IF NOT EXISTS utm_medium    text,
  ADD COLUMN IF NOT EXISTS utm_campaign  text,
  -- 옛 테이블에서 옮긴 줄의 출처(site_visits · post_views · work_views) — 새 기록은 NULL
  ADD COLUMN IF NOT EXISTS migrated_from text,
  -- 옮긴 원래 줄의 id — 복사를 다시 돌려도 겹치지 않게(2단계에서 지운다)
  ADD COLUMN IF NOT EXISTS legacy_id     uuid,
  -- 글 · 작업물 조회 줄에 방문 정보를 붙인 경우 그 site_visits id(2단계에서 지운다)
  ADD COLUMN IF NOT EXISTS legacy_visit_id uuid;

-- 방문의 첫 조회 확인 · 세션 집계
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.page_views (session_id);
-- 방문 · 유입 · 기기 집계는 첫 조회 줄만 본다
CREATE INDEX IF NOT EXISTS idx_page_views_landing_date ON public.page_views (viewed_date DESC) WHERE is_landing;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_page_views_legacy ON public.page_views (migrated_from, legacy_id) WHERE legacy_id IS NOT NULL;

-- 조회 기록 — 반환: 조회 id · 새로 셌는가 · 방문의 첫 조회인가
DROP FUNCTION IF EXISTS public.record_page_view(text, text, text);
CREATE OR REPLACE FUNCTION public.record_page_view(
  p_path text, p_ip text, p_session text, p_visitor text, p_meta jsonb DEFAULT '{}'
)
RETURNS TABLE(view_id uuid, created boolean, landing boolean)
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_landing boolean;
  v_bot boolean := COALESCE(p_meta->>'device_kind', '') = 'bot';
  v_slug text;
BEGIN
  -- 같은 IP · 경로의 동시 요청이 둘 다 새 행을 만들지 않게 줄 세운다
  PERFORM pg_advisory_xact_lock(hashtext('page_view:' || COALESCE(p_ip, '') || ':' || COALESCE(p_path, '')));

  SELECT pv.id INTO v_id
    FROM page_views pv
   WHERE pv.ip = p_ip AND pv.path = p_path AND pv.viewed_at > now() - interval '30 minutes'
   ORDER BY pv.viewed_at DESC
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, false, false;
    RETURN;
  END IF;

  v_landing := p_session IS NULL OR NOT EXISTS (SELECT 1 FROM page_views pv WHERE pv.session_id = p_session);

  INSERT INTO page_views (
    path, ip, session_id, visitor_id, is_landing, device_kind,
    referrer, user_agent, os, browser, device_model, country, utm_source, utm_medium, utm_campaign
  )
  VALUES (
    p_path, p_ip, p_session, p_visitor, v_landing, p_meta->>'device_kind',
    CASE WHEN v_landing THEN p_meta->>'referrer' END,
    CASE WHEN v_landing THEN p_meta->>'user_agent' END,
    CASE WHEN v_landing THEN p_meta->>'os' END,
    CASE WHEN v_landing THEN p_meta->>'browser' END,
    CASE WHEN v_landing THEN p_meta->>'device_model' END,
    CASE WHEN v_landing THEN p_meta->>'country' END,
    CASE WHEN v_landing THEN p_meta->>'utm_source' END,
    CASE WHEN v_landing THEN p_meta->>'utm_medium' END,
    CASE WHEN v_landing THEN p_meta->>'utm_campaign' END
  )
  RETURNING page_views.id INTO v_id;

  -- 글 · 작업물 조회수(목록 정렬 · 표시용 카운터) — 상세 경로의 새 조회일 때만
  IF NOT v_bot AND p_path ~ '^/(posts|works)/[^/]+$' THEN
    v_slug := split_part(p_path, '/', 3);
    IF p_path LIKE '/posts/%' THEN
      UPDATE posts SET view_count = COALESCE(view_count, 0) + 1 WHERE slug = v_slug AND deleted_at IS NULL;
    ELSE
      UPDATE works SET view_count = COALESCE(view_count, 0) + 1 WHERE slug = v_slug AND deleted_at IS NULL;
    END IF;
  END IF;

  RETURN QUERY SELECT v_id, true, v_landing;
END;
$$;

-- 집계 — 봇 줄은 모두 뺀다
CREATE OR REPLACE FUNCTION public.daily_page_views(p_start date, p_end date, p_excluded text[] DEFAULT '{}')
RETURNS TABLE(day date, views bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT viewed_date AS day, COUNT(*)::bigint AS views
    FROM page_views
   WHERE viewed_date >= p_start AND viewed_date <= p_end
     AND (device_kind IS NULL OR device_kind <> 'bot')
     AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))))
   GROUP BY viewed_date
   ORDER BY viewed_date ASC;
$$;

CREATE OR REPLACE FUNCTION public.page_view_totals(p_excluded text[] DEFAULT '{}')
RETURNS TABLE(total bigint, since date)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint AS total, MIN(viewed_date) AS since
    FROM page_views
   WHERE (device_kind IS NULL OR device_kind <> 'bot')
     AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))));
$$;

CREATE OR REPLACE FUNCTION public.page_view_stats(p_start date, p_end date, p_excluded text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH v AS (
    SELECT path, session_id, duration_ms
      FROM page_views
     WHERE viewed_date >= p_start AND viewed_date <= p_end
       AND (device_kind IS NULL OR device_kind <> 'bot')
       AND (ip IS NULL OR NOT (ip = ANY (COALESCE(p_excluded, '{}'))))
  ), s AS (
    SELECT session_id, COUNT(*) AS n, SUM(COALESCE(duration_ms, 0)) AS ms
      FROM v
     WHERE session_id IS NOT NULL
     GROUP BY session_id
  ), p AS (
    SELECT path, COUNT(*) AS views, ROUND(AVG(duration_ms) FILTER (WHERE duration_ms > 0))::bigint AS avg_ms
      FROM v
     WHERE path IS NOT NULL
     GROUP BY path
     ORDER BY views DESC, path
     LIMIT 20
  )
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM v),
    'avg_duration_ms', (SELECT ROUND(AVG(duration_ms))::bigint FROM v WHERE duration_ms > 0),
    'sessions', (SELECT COUNT(*) FROM s),
    'pages_per_session', (SELECT ROUND(AVG(n)::numeric, 1) FROM s),
    'avg_session_ms', (SELECT ROUND(AVG(ms) FILTER (WHERE ms > 0))::bigint FROM s),
    'top_paths', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('path', path, 'views', views, 'avg_ms', avg_ms) ORDER BY views DESC, path) FROM p),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.record_page_view(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.daily_page_views(date, date, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.page_view_totals(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.page_view_stats(date, date, text[]) FROM PUBLIC, anon, authenticated;

-- 옛 기록 복사 — 1단계와 2단계(삭제 직전)에 한 번씩 부른다. 반환: 새로 옮긴 줄 수
CREATE OR REPLACE FUNCTION public._migrate_legacy_views()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n integer := 0;
  k integer;
BEGIN
  -- 1) 글 조회
  INSERT INTO page_views (path, ip, session_id, visitor_id, viewed_at, migrated_from, legacy_id)
  SELECT '/posts/' || p.slug, v.ip,
         'legacy:' || md5(COALESCE(v.ip, v.id::text) || ':' || v.viewed_date),
         'legacy:' || md5(COALESCE(v.ip, v.id::text)),
         v.viewed_at, 'post_views', v.id
    FROM post_views v JOIN posts p ON p.id = v.post_id
   WHERE p.slug IS NOT NULL
  ON CONFLICT (migrated_from, legacy_id) WHERE legacy_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS k = ROW_COUNT; n := n + k;

  -- 2) 작업물 조회
  INSERT INTO page_views (path, ip, session_id, visitor_id, viewed_at, migrated_from, legacy_id)
  SELECT '/works/' || w.slug, v.ip,
         'legacy:' || md5(COALESCE(v.ip, v.id::text) || ':' || v.viewed_date),
         'legacy:' || md5(COALESCE(v.ip, v.id::text)),
         v.viewed_at, 'work_views', v.id
    FROM work_views v JOIN works w ON w.id = v.work_id
   WHERE w.slug IS NOT NULL
  ON CONFLICT (migrated_from, legacy_id) WHERE legacy_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS k = ROW_COUNT; n := n + k;

  -- 3) 방문 — 원래 IP(익명화 'anon:' 은 없음, 봇은 'bot:' 접두사를 뗀다)로 세션을 맞춘다
  DROP TABLE IF EXISTS _sv;
  CREATE TEMP TABLE _sv AS
  SELECT s.id, s.ip AS raw_ip, s.date, s.path, s.referrer, s.user_agent, s.device_kind, s.os, s.browser, s.device_model,
         s.country, s.utm_source, s.utm_medium, s.utm_campaign,
         CASE WHEN s.ip LIKE 'anon:%' OR s.ip = '' THEN NULL
              WHEN s.ip LIKE 'bot:%' THEN substr(s.ip, 5)
              ELSE s.ip END AS real_ip
    FROM site_visits s
   WHERE NOT EXISTS (SELECT 1 FROM page_views x WHERE x.migrated_from = 'site_visits' AND x.legacy_id = s.id)
     AND NOT EXISTS (SELECT 1 FROM page_views x WHERE x.legacy_visit_id = s.id);

  -- 3-1) 랜딩 경로가 같은 날 같은 IP 의 옮긴 글 · 작업물 조회와 같으면 그 줄에 방문 정보를 붙인다(한 줄만)
  WITH m AS (
    SELECT DISTINCT ON (sv.id) sv.*, pv.id AS pv_id
      FROM _sv sv
      JOIN page_views pv
        ON pv.migrated_from IN ('post_views', 'work_views')
       AND pv.session_id = 'legacy:' || md5(sv.real_ip || ':' || sv.date)
       AND pv.path = sv.path
     WHERE sv.real_ip IS NOT NULL AND sv.path IS NOT NULL AND COALESCE(sv.device_kind, '') <> 'bot'
     ORDER BY sv.id, pv.viewed_at
  ), u AS (
    UPDATE page_views pv
       SET is_landing = true, referrer = m.referrer, user_agent = m.user_agent, device_kind = m.device_kind,
           os = m.os, browser = m.browser, device_model = m.device_model, country = m.country,
           utm_source = m.utm_source, utm_medium = m.utm_medium, utm_campaign = m.utm_campaign,
           legacy_visit_id = m.id
      FROM m
     WHERE pv.id = m.pv_id
    RETURNING m.id
  )
  DELETE FROM _sv WHERE id IN (SELECT id FROM u);

  -- 3-2) 나머지는 방문의 첫 조회 한 줄로(시각은 그날 0시 KST)
  INSERT INTO page_views (
    path, ip, session_id, visitor_id, is_landing, viewed_at,
    referrer, user_agent, device_kind, os, browser, device_model, country, utm_source, utm_medium, utm_campaign,
    migrated_from, legacy_id
  )
  SELECT sv.path, sv.real_ip,
         -- 세션 열쇠는 원래 값('bot:' 접두사 · 'anon:<id>' 그대로) — 같은 IP 의 봇과 사람이 한 세션으로 묶이지 않게
         'legacy:' || md5(COALESCE(NULLIF(sv.raw_ip, ''), sv.id::text) || ':' || sv.date),
         'legacy:' || md5(COALESCE(sv.real_ip, sv.id::text)),
         true, (sv.date::timestamp AT TIME ZONE 'Asia/Seoul'),
         sv.referrer, sv.user_agent, sv.device_kind, sv.os, sv.browser, sv.device_model, sv.country,
         sv.utm_source, sv.utm_medium, sv.utm_campaign,
         'site_visits', sv.id
    FROM _sv sv
  ON CONFLICT (migrated_from, legacy_id) WHERE legacy_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS k = ROW_COUNT; n := n + k;

  DROP TABLE IF EXISTS _sv;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public._migrate_legacy_views() FROM PUBLIC, anon, authenticated;

SELECT public._migrate_legacy_views();

SELECT log_migration_applied(
  '2026_10_15_page_views_unify',
  'page_views 로 조회 기록 통일 1단계 — 방문 정보 · 방문자 칸 추가, site_visits · post_views · work_views 복사, 글 · 작업물 조회수도 여기서'
);

-- 확인
--   SELECT migrated_from, count(*), count(*) FILTER (WHERE is_landing) AS landings FROM page_views GROUP BY 1;
--   SELECT public.page_view_totals();
