import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /api/admin/auth/logout-all
 *  현재 admin 의 모든 기기 세션 무효화 (scope: 'global').
 *  현재 세션 포함이라 호출 직후 클라이언트도 로그아웃 됨 → login 페이지로 리다이렉트 권장. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
