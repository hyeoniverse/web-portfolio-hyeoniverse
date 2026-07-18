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
  });
}
