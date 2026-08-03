import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * 소유자 부트스트랩 (claim-and-close) — 이슈 #334 계열.
 *
 * `OWNER_EMAIL` allowlist 로 인정된 소유자가 **처음 로그인**하면 `app_metadata.role="owner"` 를
 * 1회 DB 에 못박는다. 이후엔 env 가 바뀌거나 비어도 소유권이 유지되고, 매 요청 env 판정에
 * 의존하지 않는다(실무 self-host 앱의 first-run 소유자 확정 패턴).
 *
 * app_metadata 는 service role(admin client)로만 쓸 수 있어 신뢰 가능하다.
 * 기존 author_id·permission_level 등은 보존하고 role 만 얹는다. 이미 owner 면 no-op(idempotent).
 *
 * @returns 이번에 새로 기록했으면 true(호출부에서 세션 새로고침 필요), 이미 owner 였으면 false.
 */
export async function ensureOwnerRole(admin: SupabaseClient, user: User): Promise<boolean> {
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (meta.role === "owner") return false;
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...meta, role: "owner" },
  });
  return true;
}
