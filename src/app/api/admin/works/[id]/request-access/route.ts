import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { getUserRole, canEditWork } from "@/lib/api/roles";
import { notifyAdmin } from "@/lib/adminNotify";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/works/[id]/request-access — 이 작업물의 팀원 등록을 소유자에게 요청
 *
 * 작업물의 편집 권한은 팀원 목록으로 정해진다. 그래서 요청도 "팀원으로 넣어 달라" 는 형태다.
 * 권한을 주지는 않는다 — 소유자 알림에 쌓이고, 부여는 작업물 편집의 팀원 목록에서 이뤄진다.
 *
 * 조회는 service_role 로 한다. 요청자는 이 작업물을 편집할 수 없는 사람이라
 * 세션 클라이언트로는 판정에 쓸 team_members 를 읽을 수 없다.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { data: work } = await admin
    .from("works")
    .select("id, title, team_members")
    .eq("id", id)
    .maybeSingle();

  if (!work) return NextResponse.json({ error: "not found" }, { status: 404 });

  const role = getUserRole(auth.user);
  if (canEditWork(role, work.team_members as { author_id?: string }[] | null)) {
    return NextResponse.json({ error: "이미 이 작업물을 편집할 수 있습니다." }, { status: 400 });
  }

  const who = auth.user.email ?? auth.user.id;
  await notifyAdmin({
    type: "access_request",
    title: "팀원 등록 요청",
    message: `${who} 님이 "${work.title || "제목 없음"}" 작업물의 팀원 등록을 요청했습니다.`,
    metadata: { workId: work.id, requestedBy: who, userId: auth.user.id, authorId: role.authorId ?? "" },
  });

  return NextResponse.json({ ok: true });
}
