-- SECURITY DEFINER 함수 실행 권한 회수 — 공개 anon 키로 누구나 부를 수 있었다.
--
-- Postgres 는 새 함수의 EXECUTE 를 PUBLIC 에 주고, Supabase 는 public 스키마 함수를 anon · authenticated 에도 준다.
-- PostgREST 는 public 함수를 /rest/v1/rpc/<이름> 으로 내놓으므로, 아래 함수들은 브라우저에 공개된 anon 키만으로 실행됐다.
--   _get_vault_secret(name)  — Vault 비밀값을 이름으로 그대로 돌려준다(Resend API 키 · 관리자 메일 등). 가장 위험.
--   _send_admin_email(...)   — 사이트 도메인으로 관리자에게 아무 HTML 메일이나 보낸다(피싱 · 발송량 소진).
--   log_migration_applied    — 관리자 알림 · 마이그레이션 기록에 가짜 행을 넣는다.
--   publish_scheduled · purge_trash_scheduled · safe_* — 예약 발행 · 휴지통 비우기를 아무 때나 돌린다.
--
-- 이 함수들은 pg_cron(DB 소유자 권한)과 service_role(예약 발행 API)만 부른다 — anon · authenticated 권한을 거둬도 동작은 그대로다.
-- 아울러 search_path 를 고정해, 호출 시점의 search_path 로 다른 스키마의 같은 이름 객체를 끌어오지 못하게 한다.
--
-- 적용 뒤 확인(모두 false 여야 한다):
--   select has_function_privilege('anon', 'public._get_vault_secret(text)', 'execute'),
--          has_function_privilege('authenticated', 'public._get_vault_secret(text)', 'execute');
-- 적용 전 노출됐을 수 있으니 Vault 의 resend_api_key 는 새로 발급해 바꾼다.

REVOKE ALL ON FUNCTION public._get_vault_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._send_admin_email(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_migration_applied(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_trash_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.safe_publish_scheduled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.safe_purge_trash_scheduled() FROM PUBLIC, anon, authenticated;

-- 예약 발행 API(/api/cron/publish-scheduled)는 service_role 로 publish_scheduled 를 부른다 — 명시적으로 남긴다
GRANT EXECUTE ON FUNCTION public.publish_scheduled() TO service_role;

ALTER FUNCTION public._get_vault_secret(text) SET search_path = public, pg_temp;
ALTER FUNCTION public._send_admin_email(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_migration_applied(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.publish_scheduled() SET search_path = public, pg_temp;
ALTER FUNCTION public.purge_trash_scheduled() SET search_path = public, pg_temp;
ALTER FUNCTION public.safe_publish_scheduled() SET search_path = public, pg_temp;
ALTER FUNCTION public.safe_purge_trash_scheduled() SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
