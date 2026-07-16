import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { requireAuth } from "./requireAuth";
import { getUserRole, type UserRole } from "./roles";

/**
 * requireAuth 위에 역할/권한을 얹은 헬퍼 (이슈 #334 Phase 1).
 * 성공 시 user + supabase + 해석된 role 을 반환, 실패 시 401/403 NextResponse.
 */

type Ok = { user: User; supabase: SupabaseClient; role: UserRole; error?: never };
type Err = { user?: never; supabase?: never; role?: never; error: NextResponse };

/** 인증 + 최소 권한 레벨 요구 (owner 는 항상 통과). */
export async function requireRole(minLevel: number): Promise<Ok | Err> {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const role = getUserRole(auth.user);
  if (!role.isOwner && role.level < minLevel) {
    return {
      error: NextResponse.json(
        { error: "Forbidden", reason: `권한 레벨 ${minLevel} 이상이 필요합니다. 현재 역할: ${role.role ?? "없음"}(레벨 ${role.level}).` },
        { status: 403 },
      ),
    };
  }
  return { user: auth.user, supabase: auth.supabase, role };
}

/** owner 전용 (사이트 설정·저자 관리 등). */
export async function requireOwner(): Promise<Ok | Err> {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const role = getUserRole(auth.user);
  if (!role.isOwner) {
    return {
      error: NextResponse.json(
        {
          error: "Forbidden",
          reason: `owner 권한이 필요합니다. (현재 계정 ${auth.user.email ?? "?"} 이 owner 로 인식 안 됨 — 서버의 OWNER_EMAIL 환경변수가 이 이메일로 설정됐는지, 또는 app_metadata.role=owner 인지 확인)`,
        },
        { status: 403 },
      ),
    };
  }
  return { user: auth.user, supabase: auth.supabase, role };
}
