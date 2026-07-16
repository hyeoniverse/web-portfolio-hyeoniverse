import type { SupabaseClient, User } from "@supabase/supabase-js";

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

/** 초대를 계정에 적용 — app_metadata(role/author_id/level) 부여 + 초대 소비 처리. */
export async function consumeInvite(admin: SupabaseClient, user: User, invite: AuthorInvite): Promise<void> {
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      role: "author",
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
