import { createClient as createServerClient } from "@/lib/supabase/server";
import { getUserRole, isSiteStaff } from "./roles";

/**
 * 이 요청이 사이트 운영자(owner · admin)의 것인가 — 조회수 · 페이지 조회 기록에서 본인 조회를 빼는 판정(쿠키 세션).
 * 예전에는 로그인만 돼 있으면 뺐다 — 작성자 · 다른 로그인 사용자의 조회까지 사라졌다(#1399).
 */
export async function isStaffViewer(): Promise<boolean> {
  const server = await createServerClient();
  const { data: { user } } = await server.auth.getUser();
  return isSiteStaff(getUserRole(user));
}
