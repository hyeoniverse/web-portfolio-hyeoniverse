import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "./requireAuth";
import { getUserRole, canEditPost, canEditWork, type UserRole } from "./roles";
import type { ApiErrorCode, ErrorParams } from "@/lib/apiError";

type Granted = { supabase: SupabaseClient; user: User; role: UserRole; error?: never };
type Denied = { supabase?: never; user?: never; role?: never; error: NextResponse };

/**
 * 인증 + "이 행을 고칠 수 있는가" 까지 확인하고, 통과하면 **세션 클라이언트**를 넘긴다.
 *
 * 두 테이블의 규칙이 다르다.
 *   posts  author_ids 가 있어 소유권을 따진다 — canEditPost 가 판정한다.
 *   works  author_ids 컬럼이 없다. 대신 팀원 목록(team_members)에 연결된 저자 프로필로
 *          소유권을 표현한다 — canEditWork 가 판정한다.
 *
 * **판정 조회는 service_role 로 한다.** 세션 클라이언트로 읽으면 정책이 먼저 행을 걸러서,
 * 권한이 없는 대상과 존재하지 않는 대상이 똑같이 0행으로 돌아온다. 그러면 멀쩡히 있는 글에도
 * "없음" 이라고 답하게 된다. 여기서 읽는 것은 author_ids 하나뿐이고 응답에 싣지도 않는다 —
 * 어떤 상태 코드를 줄지 정하기 위한 조회다.
 *
 * 실제 읽기·쓰기는 돌려주는 세션 클라이언트로 하므로 정책의 검사를 그대로 받는다.
 * 판정과 강제를 나눠 두면 상태 코드는 정확해지고, 코드가 판정을 틀려도 정책이 남는다.
 */
/**
 * 접근 확인을 통과한 뒤의 조회가 0행일 때 쓰는 응답.
 *
 * 대상이 있는 것도, 다룰 권한이 있는 것도 이미 확인한 상태다. 그런데도 정책이 행을 걸렀다면
 * 요청에 실린 토큰의 권한 정보가 최신 값과 다르다는 뜻이다(requireAuth 가 어긋남을 감지해
 * 갱신하지만, 갱신이 실패했거나 그 사이에 다시 바뀐 경우가 남는다).
 * 존재하는 대상을 "없음" 으로 답하지 않도록 사유를 밝힌다.
 */
export function policyBlocked(): NextResponse {
  return NextResponse.json(
    {
      error: "Forbidden",
      reason: "세션에 담긴 권한 정보가 최신이 아니라 접근이 거부되었습니다. 다시 로그인해 주세요.",
      /* 화면은 코드를 화면 언어 문구로 바꾼다(#862). reason 은 로그·개발용으로 남긴다 */
      code: "SESSION_STALE",
    },
    { status: 403 },
  );
}

export async function requirePostAccess(
  table: "posts" | "works",
  id: string,
): Promise<Granted | Denied> {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const { supabase, user } = auth;
  const role = getUserRole(user);

  const notFound = (): Denied => ({
    error: NextResponse.json({ error: "not found" }, { status: 404 }),
  });
  const forbidden = (reason: string, code: ApiErrorCode, params?: ErrorParams): Denied => ({
    error: NextResponse.json({ error: "Forbidden", reason, code, ...(params ? { params } : {}) }, { status: 403 }),
  });

  const admin = createAdminClient();

  if (table === "works") {
    const { data, error } = await admin.from("works").select("team_members").eq("id", id).maybeSingle();
    if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
    if (!data) return notFound();
    if (!canEditWork(role, data.team_members as { author_id?: string }[] | null)) {
      return forbidden("이 작업물의 팀원으로 등록된 계정만 편집할 수 있습니다. 소유자에게 팀원 등록을 요청해 주세요.", "WORK_TEAM_ONLY");
    }
    return { supabase, user, role };
  }

  const { data: target, error } = await admin
    .from("posts")
    .select("author_ids")
    .eq("id", id)
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!target) return notFound();

  if (!canEditPost(role, target.author_ids as string[] | null)) {
    return forbidden(`본인이 작성한 글만 수정할 수 있습니다. 현재 권한 레벨은 ${role.level}입니다.`, "POST_OWN_ONLY", { level: role.level });
  }

  return { supabase, user, role };
}
