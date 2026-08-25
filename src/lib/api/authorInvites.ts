import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getUserRole } from "./roles";

/**
 * 저자 초대 로직 (이슈 #334 P1-c) — API(초대 시)와 /auth/callback(로그인 시 매칭) 공용.
 * app_metadata 는 service role(admin client)로만 쓸 수 있어 신뢰 가능.
 */

export interface AuthorInvite {
  email: string;
  author_id: string;
  permission_level: number;
  invited_by: string | null;
  created_at: string;
  consumed_at: string | null;
}

/** 아직 소비되지 않은 초대 조회 (email 소문자 매칭). */
export async function getPendingInvite(admin: SupabaseClient, email: string): Promise<AuthorInvite | null> {
  const { data } = await admin
    .from("author_invites")
    .select("*")
    .eq("email", email.toLowerCase())
    .is("consumed_at", null)
    .maybeSingle();
  return (data as AuthorInvite | null) ?? null;
}

/** 초대를 계정에 적용 — app_metadata(role/author_id/level) 부여 + 초대 소비 처리.
 *
 *  소유자의 role 은 덮어쓰지 않는다. /auth/callback 은 ensureOwnerRole 로 owner 를 못박은 **뒤에**
 *  초대를 소비하므로, 여기서 role 을 무조건 "author" 로 쓰면 방금 부여한 소유권이 바로 지워진다.
 *  isOwner 판정에 getUserRole 을 쓰는 이유는 두 가지다 — 콜백이 넘겨주는 user 객체는
 *  ensureOwnerRole 이 쓰기 전에 읽은 것이라 app_metadata.role 이 아직 갱신돼 있지 않고,
 *  OWNER_EMAIL 로만 소유자인 계정(아직 못박히기 전)도 같이 걸러야 한다. */
export async function consumeInvite(admin: SupabaseClient, user: User, invite: AuthorInvite): Promise<void> {
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...meta,
      role: getUserRole(user).isOwner ? "owner" : "author",
      author_id: invite.author_id,
      permission_level: invite.permission_level,
    },
  });
  await admin.from("author_invites").update({ consumed_at: new Date().toISOString() }).eq("email", invite.email);
}

/** 초대한 이메일의 계정이 이미 있으면 즉시 적용(로그인 기다리지 않음). 없으면 no-op → 로그인 시 매칭. */
export async function applyInviteToExistingUser(admin: SupabaseClient, invite: AuthorInvite): Promise<boolean> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data?.users?.find((u) => u.email?.toLowerCase() === invite.email.toLowerCase());
  if (!user) return false;
  await consumeInvite(admin, user, invite);
  return true;
}
