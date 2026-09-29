import { requireOwner } from "@/lib/api/requireRole";
import { jsonOk } from "@/lib/api/response";
import { clearServiceLog, readServiceLog } from "@/lib/serviceLog";
import { SERVICE_LOG_CATEGORIES, type ServiceLogCategory } from "@/lib/serviceLogTypes";

/**
 * GET /api/admin/ai-log?category= — 서비스 호출 기록(AI·메일·GitHub·예약 작업·문의 폼 첨부), 새것부터 최근 500건.
 * 공급자가 돌려준 오류 문장(키는 가림)이 들어 있어 상태 패널과 같은 등급(owner)으로 둔다.
 * DELETE — 기록을 비운다.
 */
export async function GET(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;
  const c = new URL(request.url).searchParams.get("category");
  const category = (SERVICE_LOG_CATEGORIES as readonly string[]).includes(c ?? "") ? (c as ServiceLogCategory) : undefined;
  return jsonOk({ entries: await readServiceLog({ category }) });
}

export async function DELETE() {
  const { error } = await requireOwner();
  if (error) return error;
  await clearServiceLog();
  return jsonOk({ success: true });
}
