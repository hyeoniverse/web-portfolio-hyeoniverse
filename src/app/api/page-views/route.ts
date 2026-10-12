import { createAdminClient } from "@/lib/supabase/admin";
import { loadExcludedIps } from "@/lib/api/ipAnalytics";
import { isStaffViewer } from "@/lib/api/staffViewer";
import { jsonOk } from "@/lib/api/response";
import { getIp } from "@/utils/getIp";
import { parseUserAgent } from "@/utils/uaParser";
import { isSessionId, normalizePagePath } from "@/lib/pageViews";

// POST /api/page-views { path, session } — 페이지 조회 한 건 기록(#1399). 응답 { id } — 떠날 때 머문 시간을 이 id 로 보낸다.
// 기록하지 않는 경우: 관리 화면 · API 경로, 봇, 사이트 운영자 본인(owner · admin), '내 IP' 로 지정한 IP.
// 같은 IP 가 같은 경로를 30분 안에 다시 보면 record_page_view 가 앞 조회의 id 를 돌려준다(새로 세지 않음).
// 마이그레이션 전(테이블 없음)이면 실패를 삼키고 id 없이 돌려준다 — 화면에는 영향이 없다.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { path?: unknown; session?: unknown } | null;
  const path = normalizePagePath(body?.path);
  if (!path) return jsonOk({ id: null, skipped: "path" });

  if (parseUserAgent(request.headers.get("user-agent") ?? "").device === "bot") {
    return jsonOk({ id: null, skipped: "bot" });
  }
  if (await isStaffViewer()) return jsonOk({ id: null, skipped: "admin" });

  const ip = getIp(request);
  const admin = createAdminClient();
  if ((await loadExcludedIps(admin)).has(ip)) return jsonOk({ id: null, skipped: "excluded" });

  const { data, error } = await admin.rpc("record_page_view", {
    p_path: path,
    p_ip: ip,
    p_session: isSessionId(body?.session) ? body.session : null,
  });
  if (error) {
    console.warn("[api/page-views] record failed:", error.message);
    return jsonOk({ id: null });
  }
  return jsonOk({ id: typeof data === "string" ? data : null });
}
