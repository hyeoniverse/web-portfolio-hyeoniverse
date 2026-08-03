import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
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
// 정책:
//   - admin (로그인한 본인) 의 방문은 카운트 제외 — /api/posts/[id]/view 와 동일 정책 통일
//   - bot 의 방문도 카운트 제외 — 크롤러 노이즈 차단
export async function POST(request: Request) {
  // admin 인지 확인 (cookie 기반) — 본인 방문은 skip
  const server = await createServerClient();
  const { data: { user } } = await server.auth.getUser();
  if (user) {
    return jsonOk({ success: true, skipped: "admin" });
  }

  const ip = getIp(request);
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const userAgent = request.headers.get("user-agent") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const referrerHost = extractReferrerHost(referer);
  const parsed = parseUserAgent(userAgent);

  // 봇은 통계 노이즈 → 기록 안 함
  if (parsed.device === "bot") return jsonOk({ success: true, skipped: "bot" });

  const { error } = await admin
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

  // 스키마 드리프트(예: 메타 컬럼 누락)로 insert 가 조용히 실패하던 사고 재발 방지 —
  // 실패를 서버 로그로 드러낸다. (기존엔 에러를 안 보고 무조건 success 를 반환해 today 0 인 걸 못 잡았음)
  if (error) {
    console.warn("[api/visits] insert failed:", error.message);
    return jsonOk({ success: false });
  }

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
