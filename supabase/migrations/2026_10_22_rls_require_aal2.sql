-- 역할 판정은 2단계 인증(aal2) 세션에서만 (보안 점검 2단계)
--
-- 정책은 app_role() · app_level() · app_author_id() 로 요청자의 역할을 본다(is_admin · is_member · can_edit_post …).
-- 이 값은 JWT 의 app_metadata 에서 나와서, 비밀번호만으로 만든 세션(aal1)도 같은 역할을 가졌다.
-- 앱은 이제 OTP 확인(aal2) 전 세션을 관리 화면 · API 에서 막지만(lib/auth/mfa), 세션 토큰으로
-- PostgREST(/rest/v1)에 직접 오면 정책만 남는다 — 그래서 정책도 aal2 세션의 역할만 인정한다.
-- aal1 세션은 익명 방문자와 같은 공개 정책만 받는다. 소유자가 2단계 인증 강제를 끄면(security_settings) aal1 도 역할을 받는다.
--
-- 적용 전: 관리하는 모든 계정이 /admin/mfa 에서 인증 앱을 등록해 둔다(등록 화면은 DB 를 쓰지 않아 이 마이그레이션과 무관하다).
-- 인증 앱을 잃어버리면(복구): SQL Editor 에서 delete from auth.mfa_factors where user_id = '<사용자 id>'; → 다시 로그인해 새로 등록.

-- 2단계 인증 강제 여부 — 소유자가 설정 › 계정 에서 끄고 켠다(기본 켜짐). 한 줄짜리 표.
-- 서버(service_role)만 쓴다. 정책과 앱은 아래 mfa_required() 로만 읽는다.
CREATE TABLE IF NOT EXISTS public.security_settings (
  id           int         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mfa_required boolean     NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.security_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_settings FROM anon, authenticated;

-- 줄이 없으면 켜진 것으로(fail-closed). 정책 안에서 요청자 권한으로 불리므로 DEFINER 로 표를 읽는다
CREATE OR REPLACE FUNCTION public.mfa_required() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce((SELECT mfa_required FROM public.security_settings WHERE id = 1), true);
$$;
REVOKE ALL ON FUNCTION public.mfa_required() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mfa_required() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_claims() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN auth.jwt() ->> 'aal' = 'aal2' OR NOT public.mfa_required()
              THEN coalesce(auth.jwt() -> 'app_metadata', '{}'::jsonb)
              ELSE '{}'::jsonb END;
$$;

CREATE OR REPLACE FUNCTION app_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(app_claims() ->> 'role', '');
$$;
CREATE OR REPLACE FUNCTION app_level() RETURNS int LANGUAGE sql STABLE AS $$
  SELECT CASE jsonb_typeof(claim)
           WHEN 'number' THEN
             /* 여기까지 왔으면 숫자가 확실하다 — 중첩 CASE 라야 타입 가드가 먼저 평가된다.
                한 WHEN 안에서 AND 로 늘어놓으면 Postgres 가 순서를 바꿀 수 있고,
                그러면 문자열 클레임에 ::numeric 이 먼저 걸려 캐스트 에러가 난다. */
             CASE WHEN n = trunc(n) AND n BETWEEN 1 AND 2 THEN n::int ELSE 0 END
           ELSE 0
         END
  FROM (SELECT app_claims() -> 'permission_level' AS claim) s,
  LATERAL (SELECT CASE WHEN jsonb_typeof(claim) = 'number'
                       THEN (claim #>> '{}')::numeric END AS n) t;
$$;
CREATE OR REPLACE FUNCTION app_author_id() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN jsonb_typeof(claim) = 'string' THEN claim #>> '{}' END
  FROM (SELECT app_claims() -> 'author_id' AS claim) s;
$$;

-- 커버 기록은 auth.uid() 로만 봤다 — 구성원(aal2) 세션으로 좁힌다
DROP POLICY IF EXISTS "Users manage own cover history" ON cover_image_history;
CREATE POLICY "Users manage own cover history"
  ON cover_image_history FOR ALL
  USING (auth.uid() = user_id AND is_member())
  WITH CHECK (auth.uid() = user_id AND is_member());

NOTIFY pgrst, 'reload schema';
