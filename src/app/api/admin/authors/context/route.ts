import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/api/roles";
import { getSiteConfig } from "@/lib/getSiteConfig";
import type { Author } from "@/types/author";

/**
 * 멤버 화면용 최소 컨텍스트 (requireAuth — 비owner 도 접근 가능). (이슈 #334)
 * 비owner 도 "소유자 표시 / 본인 프로필 식별 / 미가입 초대자 숨김" 을 계산할 수 있게,
 * 현재 사용자 식별 + owner 이메일 + 실제 가입한 멤버(author_id/email) 만 sanitize 해서 반환.
 * (민감한 전체 멤버 데이터는 owner 전용 /members 엔드포인트에서만 노출)
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const role = getUserRole(auth.user);
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase() ?? null;

  // 현재 사용자의 GitHub(OAuth) 기본 정보 — 프로필 미생성 시 "내 프로필" pre-fill 용
  const s = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
  const meta = (auth.user.user_metadata ?? {}) as Record<string, unknown>;
  const gh = ((auth.user.identities ?? []).find((i) => i.provider === "github")?.identity_data ?? {}) as Record<string, unknown>;
  const myName =
    s(meta.full_name) || s(meta.name) || s(meta.user_name) ||
    s(gh.full_name) || s(gh.name) || s(gh.user_name) ||
    (auth.user.email ? auth.user.email.split("@")[0] : null);
  const myAvatar = s(meta.avatar_url) || s(gh.avatar_url);
  const myGhUser = s(gh.user_name);
  const myGithubUrl = s(gh.html_url) || (myGhUser ? `https://github.com/${myGhUser}` : null);

  const memberAuthorIds: string[] = [];
  const memberEmails: string[] = [];
  let ownerName: string | null = null;
  let ownerAvatar: string | null = null;
  try {
    const admin = createAdminClient();
    const [usersRes, config] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      getSiteConfig(),
    ]);
    const authorEmails = new Set(
      (((config.authors as Author[] | undefined) ?? [])
        .map((a) => a.email?.toLowerCase())
        .filter(Boolean)) as string[],
    );
    for (const u of usersRes.data?.users ?? []) {
      const r = getUserRole(u);
      const email = u.email?.toLowerCase() ?? "";
      if (r.authorId) memberAuthorIds.push(r.authorId);
      // author 프로필과 관련된 계정만(연결됨 / 이메일 일치 / owner) 노출 — 무관한 계정 이메일은 숨김
      if (email && (r.authorId || r.isOwner || authorEmails.has(email))) memberEmails.push(email);
      // 소유자 이름/아바타 — 프로필이 없어도 "소유자" 행을 만들 수 있게
      if (r.isOwner) {
        const om = (u.user_metadata ?? {}) as Record<string, unknown>;
        const ogh = ((u.identities ?? []).find((i) => i.provider === "github")?.identity_data ?? {}) as Record<string, unknown>;
        ownerName =
          s(om.full_name) || s(om.name) || s(om.user_name) ||
          s(ogh.full_name) || s(ogh.name) || s(ogh.user_name) ||
          (u.email ? u.email.split("@")[0] : null);
        ownerAvatar = s(om.avatar_url) || s(ogh.avatar_url);
      }
    }
  } catch {
    /* admin 실패해도 기본 컨텍스트는 반환 */
  }

  return NextResponse.json({
    email: auth.user.email ?? null,
    authorId: role.authorId,
    isOwner: role.isOwner,
    ownerEmail,
    myName,
    myAvatar,
    myGithubUrl,
    ownerName,
    ownerAvatar,
    memberAuthorIds,
    memberEmails,
  });
}
