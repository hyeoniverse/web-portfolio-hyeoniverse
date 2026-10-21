-- 유입 검색어 — 검색 엔진 referrer 의 검색어(네이버 query · 다음/빙 q 등). 방문의 첫 조회 줄에만.
-- 구글 등은 referrer 에서 검색어를 떼므로 비어 있는 게 보통이다.
--
-- 적용 전에도 기록은 된다 — record_page_view 가 모르는 meta 키는 무시한다.

ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS search_term text;

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
    referrer, user_agent, os, browser, device_model, country, utm_source, utm_medium, utm_campaign, search_term
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
    CASE WHEN v_landing THEN p_meta->>'utm_campaign' END,
    CASE WHEN v_landing THEN p_meta->>'search_term' END
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

REVOKE ALL ON FUNCTION public.record_page_view(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
