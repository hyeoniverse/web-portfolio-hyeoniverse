import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffViewer } from "@/lib/api/staffViewer";
import { getIp } from "@/utils/getIp";
import { jsonOk } from "@/lib/api/response";
import { parseUserAgent } from "@/utils/uaParser";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/works/[id]/view — 조회수 증가 (posts 미러)
// 동작:
//   - record_work_view RPC 가 (IP + KST date) dedup + works.view_count atomic +1 을 한 트랜잭션으로 처리
//   - 사이트 운영자(owner · admin) 본인의 조회는 카운트 제외 — 자기 작업물 inflate 방지. 작성자 · 다른 로그인 사용자는 센다
//   - bot 의 조회도 카운트 제외 — 크롤러 노이즈 차단
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  // 운영자 본인 조회는 skip (cookie 세션) — 예전에는 로그인한 사용자 전부를 뺐다
  if (await isStaffViewer()) {
    return jsonOk({ success: true, skipped: "admin" });
  }

  // bot UA — 크롤러는 view_count 에서 제외
  const userAgent = request.headers.get("user-agent") ?? "";
  const parsed = parseUserAgent(userAgent);
  if (parsed.device === "bot") {
    return jsonOk({ success: true, skipped: "bot" });
  }

  const ip = getIp(request);
  const admin = createAdminClient();

  // dedup + insert + counter +1 atomic (race-free via UNIQUE (work_id, ip, viewed_date))
  const { data: counted } = await admin.rpc("record_work_view", { p_work_id: id, p_ip: ip });

  return jsonOk({ success: true, deduped: counted === false });
}
