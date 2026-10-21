-- 공유 속도 제한 · 공개 읽기 조이기 (보안 점검 1단계)
--
-- 1) rate_limits — 서버리스 인스턴스마다 메모리가 따로라 Map 기반 제한이 사실상 없었다(문의 · AI 요약).
--    댓글 · 좋아요 · 투표 · 공개 번역 · 댓글 비밀번호 확인 · 댓글 알림 메일도 제한이 없었다.
--    정해진 시간 창마다 (bucket, key) 횟수를 DB 에서 원자적으로 센다. key 는 앱이 만든 HMAC 해시(원문 IP · 이메일 아님).
--    서버(service_role)만 쓴다 — RLS 켜고 정책 없음, 함수는 anon · authenticated 실행 권한 회수.
-- 2) posts_public_read 에 deleted_at IS NULL — 휴지통으로 간 글이 published 를 그대로 가진 채 anon 으로 읽혔다
--    (시리즈 삭제가 글을 휴지통으로 보낼 때). works_public_read 와 같은 모양으로.
-- 3) calendars_public_read 에 deleted_at IS NULL — 휴지통 캘린더가 공개로 읽혔다.
-- 4) 관계 테이블 공개 읽기를 "양쪽 모두 공개된 연결" 로 — 비공개 글 · 작업물 id 와 연결이 드러났다.
--    관리 화면은 멤버 정책이 OR 로 붙어 그대로다.
-- 5) storage.objects 공개 SELECT 정책 제거 — 공개 버킷은 정책 없이도 URL 로 파일을 내준다.
--    이 정책은 목록 조회만 더 열어, uploads · posts 버킷의 전체 폴더 구조(첨부 전 이미지 등)를 보여 줬다.

-- ── 1) rate_limits ──
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket       text        NOT NULL,
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        int         NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

-- 한 번 세고 허용 여부를 돌려준다(창 안 횟수가 p_max 이하면 true). 창은 p_window_seconds 단위로 끊는다
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_bucket text, p_key text, p_window_seconds int, p_max int)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window timestamptz;
  v_count  int;
BEGIN
  IF p_window_seconds IS NULL OR p_window_seconds <= 0 OR p_max IS NULL OR p_max <= 0 THEN
    RETURN false;
  END IF;
  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  INSERT INTO public.rate_limits AS r (bucket, key, window_start, count)
  VALUES (p_bucket, p_key, v_window, 1)
  ON CONFLICT (bucket, key, window_start) DO UPDATE SET count = r.count + 1
  RETURNING r.count INTO v_count;
  RETURN v_count <= p_max;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(text, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, text, int, int) TO service_role;

-- 지난 창 정리 — 가장 긴 창(하루)보다 넉넉히 2일
CREATE OR REPLACE FUNCTION public.purge_old_rate_limits()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_deleted int;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_old_rate_limits() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN PERFORM cron.unschedule('purge-rate-limits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'purge-rate-limits',
  '50 18 * * *',
  $cron$ SELECT public.purge_old_rate_limits(); $cron$
);

-- ── 2) 휴지통 글 ──
DROP POLICY IF EXISTS "posts_public_read" ON posts;
CREATE POLICY "posts_public_read"
  ON posts FOR SELECT
  USING (published = true AND deleted_at IS NULL);

-- ── 3) 휴지통 캘린더 ──
DROP POLICY IF EXISTS "calendars_public_read" ON calendars;
CREATE POLICY "calendars_public_read"
  ON calendars FOR SELECT
  USING (deleted_at IS NULL);

-- ── 4) 관계 테이블 — 양쪽 모두 공개된 연결만 ──
DROP POLICY IF EXISTS "post_work_relations_public_read" ON post_work_relations;
CREATE POLICY "post_work_relations_public_read"
  ON post_work_relations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.published AND p.deleted_at IS NULL)
    AND EXISTS (SELECT 1 FROM works w WHERE w.id = work_id AND w.published AND w.deleted_at IS NULL)
  );

DROP POLICY IF EXISTS "series_work_relations_public_read" ON series_work_relations;
CREATE POLICY "series_work_relations_public_read"
  ON series_work_relations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM series s WHERE s.id = series_id AND s.published)
    AND EXISTS (SELECT 1 FROM works w WHERE w.id = work_id AND w.published AND w.deleted_at IS NULL)
  );

-- ── 5) 버킷 목록 ──
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view posts" ON storage.objects;

NOTIFY pgrst, 'reload schema';
