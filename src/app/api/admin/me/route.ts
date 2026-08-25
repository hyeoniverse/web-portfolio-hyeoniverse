import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { getUserRole } from "@/lib/api/roles";

/** 현재 로그인 사용자의 역할 요약 — 설정 UI 권한 게이팅용. (이슈 #334) */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const role = getUserRole(auth.user);
  return NextResponse.json({
    email: auth.user.email ?? null,
    role: role.role,
    level: Number.isFinite(role.level) ? role.level : null,
    isOwner: role.isOwner,
    /* 화면에서 "이 글을 내가 고칠 수 있나" 를 판정하려면 연결된 저자 id 가 필요하다.
       서버 판정(canEditPost)과 같은 근거를 쓰게 해서 버튼과 실제 권한이 어긋나지 않게 한다. */
    authorId: role.authorId,
  });
}
