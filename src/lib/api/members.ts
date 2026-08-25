import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserRole, toMemberRole, toPermissionLevel } from "./roles";
import { getSiteConfig } from "@/lib/getSiteConfig";
import type { Author } from "@/types/author";
import type { Member, MemberRole, PendingMember } from "@/types/member";

/**
 * 관리자 멤버(인증된 사용자) 목록 (이슈 #334) — 대시보드 + settings 계정 탭 공용.
 * owner + 초대로 가입한 저자/편집자를 Supabase auth 에서 읽어 역할·로그인 수단(provider)과 함께 반환.
 */

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

const rank = (r: MemberRole) =>
  r === "owner" ? 3 : r === "admin" ? 2 : r === "author" ? 1 : 0;

export async function listMembers(
  admin: SupabaseClient,
): Promise<{ members: Member[]; pendingInvites: PendingMember[] }> {
  const [usersRes, config] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    getSiteConfig(),
  ]);

  const authors = ((config.authors as Author[] | undefined) ?? []);
  const authorById = new Map(authors.map((a) => [a.id, a]));

  const members: Member[] = (usersRes.data?.users ?? []).map((u) => {
    const role = getUserRole(u);
    const roleLabel = toMemberRole(role);
    const providers = Array.from(new Set((u.identities ?? []).map((i) => i.provider)));
    const author = role.authorId ? authorById.get(role.authorId) : undefined;
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    // GitHub 등 OAuth identity 원본 데이터 — 프로필 없는 계정의 기본값(이름/아바타)을 여기서 채움
    const gh = ((u.identities ?? []).find((i) => i.provider === "github")?.identity_data ?? {}) as Record<string, unknown>;
    const name =
      author?.name ||
      str(meta.full_name) || str(meta.name) || str(meta.user_name) ||
      str(gh.full_name) || str(gh.name) || str(gh.user_name) ||
      (u.email ? u.email.split("@")[0] : null);
    const avatar = author?.avatar || str(meta.avatar_url) || str(gh.avatar_url);
    const ghUser = str(gh.user_name);
    const githubUrl = str(gh.html_url) || (ghUser ? `https://github.com/${ghUser}` : null);
    return {
      id: u.id,
      email: u.email ?? "",
      name,
      avatar,
      role: roleLabel,
      level: role.isOwner ? null : role.level,
      providers,
      githubUrl,
      authorId: role.authorId,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    };
  });

  members.sort((a, b) => {
    const d = rank(b.role) - rank(a.role);
    if (d !== 0) return d;
    return (b.lastSignInAt ?? "").localeCompare(a.lastSignInAt ?? "");
  });

  const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));
  const { data: invites } = await admin
    .from("author_invites")
    .select("*")
    .is("consumed_at", null)
    .order("created_at", { ascending: false });

  const pendingInvites: PendingMember[] = (invites ?? [])
    .filter((i) => !memberEmails.has(String(i.email).toLowerCase()))
    .map((i) => ({
      email: i.email,
      level: toPermissionLevel(i.permission_level),
      authorId: i.author_id ?? null,
      createdAt: i.created_at,
    }));

  return { members, pendingInvites };
}
