import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { requireOwner } from "@/lib/api/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMembers } from "@/lib/api/members";
import { getUserRole, parsePermissionLevelInput } from "@/lib/api/roles";

/** 관리자 멤버 목록 (인증된 사용자 + 대기중 초대). owner 전용. (이슈 #334) */
export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const data = await listMembers(admin);
  return NextResponse.json(data);
}

/** 멤버 권한 변경/작성자 프로필 연결. owner 전용. body: { id, permission_level, author_id? }
 *  author_id 를 주면 프로필 없이 로그인만 한 계정을 그 작성자 프로필과 연결(권한 부여)한다. */
export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const level = parsePermissionLevelInput(body?.permission_level);
  const authorId = typeof body?.author_id === "string" && body.author_id ? body.author_id : undefined;
  if (!id || level == null) {
    return jsonError("id and permission_level required", 400);
  }

  const admin = createAdminClient();
  const { data: target, error: getErr } = await admin.auth.admin.getUserById(id);
  if (getErr || !target?.user) {
    // getErr 는 Supabase 관리자 API 가 준 내부 오류다. 호출자에게 알릴 것은 "못 찾았다" 하나뿐이라
    // 원문은 로그로 보내고 응답에는 우리가 쓴 문장만 남긴다.
    if (getErr) console.error(`[api] PATCH /api/admin/authors/members: ${getErr.message}`, getErr);
    return jsonError("해당 사용자를 찾을 수 없습니다.", 404);
  }
  if (getUserRole(target.user).isOwner) {
    return jsonError("owner 의 권한은 변경할 수 없습니다.", 400);
  }

  const meta = (target.user.app_metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.auth.admin.updateUserById(id, {
    app_metadata: { ...meta, role: "author", permission_level: level, ...(authorId ? { author_id: authorId } : {}) },
  });
  if (error) return jsonServerError(error, "PATCH /api/admin/authors/members");

  /* 권한이 바뀐 계정에 알린다. 그 계정의 브라우저 세션에는 아직 예전 권한이 담겨 있어
     화면이 뒤처진다(서버 판정은 요청마다 getUser() 로 하므로 영향 없음).
     권한을 바꾼 사람과 영향을 받는 사람이 달라 응답으로는 전달할 수 없어 broadcast 를 쓴다.
     실패해도 권한 변경 자체는 끝났으므로 요청을 실패시키지 않는다. */
  try {
    const ch = admin.channel(`perm:${id}`);
    await ch.subscribe();
    await ch.send({ type: "broadcast", event: "changed", payload: {} });
    await admin.removeChannel(ch);
  } catch {
    /* 알림 실패는 무시 — 대상 화면은 다음 새로고침이나 로그인 때 갱신된다 */
  }

  return NextResponse.json({ ok: true });
}

/** 멤버(로그인 계정) 완전 삭제. owner 전용. ?id= */
export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return jsonError("id required", 400);

  if (id === auth.user.id) {
    return jsonError("본인 계정은 삭제할 수 없습니다.", 400);
  }

  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(id);
  if (target?.user && getUserRole(target.user).isOwner) {
    return jsonError("owner 계정은 삭제할 수 없습니다.", 400);
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return jsonServerError(error, "DELETE /api/admin/authors/members");
  return NextResponse.json({ ok: true });
}
