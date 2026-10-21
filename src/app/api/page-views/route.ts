import { createAdminClient } from "@/lib/supabase/admin";
import { loadExcludedIps } from "@/lib/api/ipAnalytics";
import { isStaffViewer } from "@/lib/api/staffViewer";
import { jsonOk } from "@/lib/api/response";
import { HUMAN_VISITS_FILTER, isTrafficSpike, kstDateStr } from "@/lib/api/dashboardAggregates";
import { hitRateLimit, ipRateKey } from "@/lib/api/rateLimit";
import { getIp } from "@/utils/getIp";
import { parseUserAgent } from "@/utils/uaParser";
import { isSessionId, normalizePagePath, parseUtm, referrerHost } from "@/lib/pageViews";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/page-views — 오늘 · 전체 방문자 수(푸터). 대시보드 맨 위 숫자와 같은 기준 — 사람 수(방문자 id, 옛 기록은 IP),
// 봇 · '내 IP' 제외(visitor_counts). 함수가 없으면(마이그레이션 전) 0
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("visitor_counts", { p_today: kstDateStr(new Date()), p_excluded: [...(await loadExcludedIps(admin))] })
    .maybeSingle();
  const row = (error ? null : data) as { today?: number | string; total?: number | string } | null;
  return jsonOk({ today: Number(row?.today ?? 0), total: Number(row?.total ?? 0) });
}

// POST /api/page-views { path, session, visitor, referrer, search } — 페이지 조회 한 건 기록(#1399). 응답 { id } — 떠날 때 머문 시간을 이 id 로 보낸다.
// 사이트의 조회 기록은 이것 하나다 — 방문 · 방문자 · 유입 · 기기 · 글 · 작업물 조회수(view_count)까지 여기서 쌓인다.
// 기록하지 않는 경우: 관리 화면 · API 경로, 사이트 운영자 본인(owner · admin), '내 IP' 로 지정한 IP. 봇은 기기 'bot' 으로 남기고 집계에서 뺀다.
// 같은 IP 가 같은 경로를 30분 안에 다시 보면 record_page_view 가 앞 조회의 id 를 돌려준다(새로 세지 않음).
// 방문의 첫 조회(세션의 첫 줄)에만 유입 경로 · 기기 · 국가 · UTM 이 담긴다. 마이그레이션 전이면 실패를 삼키고 id 없이 돌려준다.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { path?: unknown; session?: unknown; visitor?: unknown; referrer?: unknown; search?: unknown }
    | null;
  const path = normalizePagePath(body?.path);
  if (!path) return jsonOk({ id: null, skipped: "path" });

  if (await isStaffViewer()) return jsonOk({ id: null, skipped: "admin" });
  // 스크립트가 조회를 부풀리거나 행을 쏟지 못하게 — 사람이 넘기 어려운 상한(10분 120번)
  if (!(await hitRateLimit("page-view", ipRateKey(request), { windowSec: 600, max: 120 }))) {
    return jsonOk({ id: null, skipped: "rate" });
  }

  const ip = getIp(request);
  const admin = createAdminClient();
  if ((await loadExcludedIps(admin)).has(ip)) return jsonOk({ id: null, skipped: "excluded" });

  const userAgent = request.headers.get("user-agent") ?? "";
  const ua = parseUserAgent(userAgent);
  // 국가 — Vercel 이 IP 지오로 붙여 주는 헤더(ISO 3166-1 alpha-2). 로컬 dev 는 없음
  const countryRaw = request.headers.get("x-vercel-ip-country") ?? "";
  const meta = {
    device_kind: ua.device,
    os: ua.os,
    browser: ua.browser,
    device_model: ua.model ?? null,
    user_agent: userAgent.slice(0, 500) || null,
    country: /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null,
    // 유입 — 요청의 Referer 는 지금 페이지라 늘 자기 사이트였다. 브라우저가 document.referrer 를 실어 보낸다
    referrer: referrerHost(body?.referrer, new URL(request.url).hostname),
    ...parseUtm(body?.search),
  };

  const { data, error } = await admin
    .rpc("record_page_view", {
      p_path: path,
      p_ip: ip,
      p_session: isSessionId(body?.session) ? body.session : null,
      p_visitor: isSessionId(body?.visitor) ? body.visitor : null,
      p_meta: meta,
    })
    .maybeSingle();
  if (error) {
    console.warn("[api/page-views] record failed:", error.message);
    return jsonOk({ id: null });
  }
  const row = data as { view_id?: string; created?: boolean; landing?: boolean } | null;

  // 방문 급증 감지(#1161) — 사람의 새 방문일 때만. 실패해도 기록엔 영향 없게 통째로 삼킨다
  if (row?.created && row.landing && ua.device !== "bot") {
    await maybeNotifyTrafficSpike(admin).catch((e) =>
      console.warn("[api/page-views] spike check failed:", e instanceof Error ? e.message : e),
    );
  }

  return jsonOk({ id: row?.view_id ?? null });
}

/** 오늘 방문이 직전 7일 평균의 3배 이상이면 admin 알림을 만든다. 하루 한 번만. */
async function maybeNotifyTrafficSpike(admin: SupabaseClient) {
  const today = kstDateStr(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const landings = () =>
    admin.from("page_views").select("*", { count: "exact", head: true }).eq("is_landing", true).or(HUMAN_VISITS_FILTER);

  const [todayRes, prevRes] = await Promise.all([
    landings().eq("viewed_date", today),
    landings().gte("viewed_date", kstDateStr(weekAgo)).lt("viewed_date", today),
  ]);

  const todayCount = todayRes.count ?? 0;
  const prev7Total = prevRes.count ?? 0;
  if (!isTrafficSpike(todayCount, prev7Total)) return;

  // 하루 한 번만 — 오늘 이미 만든 급증 알림이 있으면 끝
  const { data: existing } = await admin
    .from("admin_notifications")
    .select("id")
    .eq("type", "traffic_spike")
    .gte("created_at", `${today}T00:00:00+09:00`)
    .limit(1);
  if (existing && existing.length > 0) return;

  const avg = prev7Total / 7;
  const ratio = avg > 0 ? (todayCount / avg).toFixed(1) : "∞";
  await admin.from("admin_notifications").insert({
    type: "traffic_spike",
    title: "방문 급증",
    message: `오늘 방문 ${todayCount}건 — 최근 7일 평균(${avg.toFixed(1)}건)의 ${ratio}배입니다.`,
  });
}
