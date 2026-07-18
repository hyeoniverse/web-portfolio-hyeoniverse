import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/api/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { listMembers } from "@/lib/api/members";
import { getUserRole } from "@/lib/api/roles";

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
  const level = typeof body?.permission_level === "number" ? body.permission_level : null;
  const authorId = typeof body?.author_id === "string" && body.author_id ? body.author_id : undefined;
  if (!id || level == null) {
    return NextResponse.json({ error: "id and permission_level required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target, error: getErr } = await admin.auth.admin.getUserById(id);
  if (getErr || !target?.user) {
    return NextResponse.json({ error: getErr?.message ?? "해당 사용자를 찾을 수 없습니다." }, { status: 404 });
  }
  if (getUserRole(target.user).isOwner) {
    return NextResponse.json({ error: "owner 의 권한은 변경할 수 없습니다." }, { status: 400 });
  }

  const meta = (target.user.app_metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.auth.admin.updateUserById(id, {
    app_metadata: { ...meta, role: "author", permission_level: level, ...(authorId ? { author_id: authorId } : {}) },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** 멤버(로그인 계정) 완전 삭제. owner 전용. ?id= */
export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (id === auth.user.id) {
    return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(id);
  if (target?.user && getUserRole(target.user).isOwner) {
    return NextResponse.json({ error: "owner 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
