import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getIp } from "@/utils/getIp";
import { jsonOk } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/view — 조회수 증가
// 동작:
//   - record_post_view RPC 가 (IP + KST date) dedup + view_count atomic +1 을 한 트랜잭션으로 처리
//   - admin (로그인한 본인) 의 조회는 카운트 제외 — 자기 글 inflate 방지
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  // admin 인지 확인 (cookie 기반) — 본인 조회는 skip
  const server = await createServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (user) {
    return jsonOk({ success: true, skipped: "admin" });
  }

  const ip = getIp(request);
  const admin = createAdminClient();

  // dedup + insert + counter +1 atomic (race-free via UNIQUE (post_id, ip, viewed_date))
  const { data: counted } = await admin.rpc("record_post_view", { p_post_id: id, p_ip: ip });

  return jsonOk({ success: true, deduped: counted === false });
}
