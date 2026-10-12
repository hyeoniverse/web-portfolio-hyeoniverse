import { createAdminClient } from "@/lib/supabase/admin";
import { jsonOk } from "@/lib/api/response";
import { getIp } from "@/utils/getIp";
import { clampDuration, isPageViewId } from "@/lib/pageViews";

// POST /api/page-views/duration { id, ms } — 그 조회에 보인 채 머문 시간을 더한다(#1399). navigator.sendBeacon 으로 온다.
// 같은 조회에 여러 번 올 수 있다(탭을 숨길 때마다 그때까지의 시간) — 서버가 더한다. 한 조회 2시간 상한.
// 조회를 기록한 IP 와 같은 IP 에서 온 것만 받는다(record_page_duration). 응답은 아무도 읽지 않는다.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: unknown; ms?: unknown } | null;
  const ms = clampDuration(body?.ms);
  if (!isPageViewId(body?.id) || ms === null) return jsonOk({ ok: false });

  const { error } = await createAdminClient().rpc("record_page_duration", {
    p_id: body.id,
    p_ip: getIp(request),
    p_ms: ms,
  });
  if (error) console.warn("[api/page-views/duration] update failed:", error.message);
  return jsonOk({ ok: !error });
}
