import { createAdminClient } from "@/lib/supabase/admin";
import { getIp } from "@/utils/getIp";
import { jsonOk } from "@/lib/api/response";
import { parseUserAgent } from "@/utils/uaParser";

// GET /api/visits — today + total 방문자 수
export async function GET() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [todayResult, totalResult] = await Promise.all([
    admin.from("site_visits").select("*", { count: "exact", head: true }).eq("date", today),
    admin.from("site_visits").select("*", { count: "exact", head: true }),
  ]);

  return jsonOk({
    today: todayResult.count ?? 0,
    total: totalResult.count ?? 0,
  });
}

// POST /api/visits — 방문 기록 (IP + date upsert) + UA / referrer 메타 저장
export async function POST(request: Request) {
  const ip = getIp(request);
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const userAgent = request.headers.get("user-agent") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const referrerHost = extractReferrerHost(referer);
  const parsed = parseUserAgent(userAgent);

  // 봇은 통계 노이즈 → 기록 안 함
  if (parsed.device === "bot") return jsonOk({ success: true, skipped: "bot" });

  await admin
    .from("site_visits")
    .upsert(
      {
        ip,
        date: today,
        referrer: referrerHost,
        user_agent: userAgent || null,
        device_kind: parsed.device,
        os: parsed.os,
        browser: parsed.browser,
        device_model: parsed.model ?? null,
      },
      { onConflict: "ip,date", ignoreDuplicates: true },
    );

  return jsonOk({ success: true });
}

/** Referer 헤더에서 호스트만 추출. 자기 자신은 "Direct" 로 정규화. */
function extractReferrerHost(ref: string): string {
  if (!ref) return "Direct";
  try {
    const url = new URL(ref);
    const host = url.hostname.replace(/^www\./, "");
    return host || "Direct";
  } catch {
    return "Direct";
  }
}
