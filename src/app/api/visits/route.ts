import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getIp } from "@/utils/getIp";
import { jsonOk } from "@/lib/api/response";
import { parseUserAgent } from "@/utils/uaParser";
import { HUMAN_VISITS_FILTER, isTrafficSpike } from "@/lib/api/dashboardAggregates";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/visits — today + total 방문자 수 (봇 제외)
export async function GET() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [todayResult, totalResult] = await Promise.all([
    admin.from("site_visits").select("*", { count: "exact", head: true }).eq("date", today).or(HUMAN_VISITS_FILTER),
    admin.from("site_visits").select("*", { count: "exact", head: true }).or(HUMAN_VISITS_FILTER),
  ]);

  return jsonOk({
    today: todayResult.count ?? 0,
    total: totalResult.count ?? 0,
  });
}

// POST /api/visits — 방문 기록 (IP + date upsert) + UA / referrer / 랜딩·국가·UTM 메타 저장
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

  // 봇은 사람 지표에선 제외하되 수는 남긴다(#1161 트래픽 페이지의 "봇 제외" 지표).
  // ip 에 접두사를 붙여 (ip,date) 유니크가 같은 IP 의 사람 방문 기록을 막지 않게 한다.
  if (parsed.device === "bot") {
    const { error: botError } = await admin.from("site_visits").upsert(
      {
        ip: `bot:${ip}`,
        date: today,
        referrer: referrerHost,
        user_agent: userAgent || null,
        device_kind: "bot",
        os: parsed.os,
        browser: parsed.browser,
        device_model: parsed.model ?? null,
      },
      { onConflict: "ip,date", ignoreDuplicates: true },
    );
    if (botError) console.warn("[api/visits] bot insert failed:", botError.message);
    return jsonOk({ success: true, skipped: "bot" });
  }

  // 랜딩 경로·UTM — VisitTracker 가 body 로 보낸다. 값은 신뢰하지 않고 형태·길이를 자른다.
  const { path, utm } = await parseLanding(request);
  // 국가 — Vercel 이 edge 에서 IP 지오로 붙여 주는 헤더 (ISO 3166-1 alpha-2). 로컬 dev 는 없음.
  const countryRaw = request.headers.get("x-vercel-ip-country") ?? "";
  const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null;

  const baseRow = {
    ip,
    date: today,
    referrer: referrerHost,
    user_agent: userAgent || null,
    device_kind: parsed.device,
    os: parsed.os,
    browser: parsed.browser,
    device_model: parsed.model ?? null,
  };

  const { error } = await admin
    .from("site_visits")
    .upsert(
      { ...baseRow, country, path, ...utm },
      { onConflict: "ip,date", ignoreDuplicates: true },
    );

  // 스키마 드리프트(예: 메타 컬럼 누락)로 insert 가 조용히 실패하던 사고 재발 방지 —
  // 실패를 서버 로그로 드러낸다. (기존엔 에러를 안 보고 무조건 success 를 반환해 today 0 인 걸 못 잡았음)
  if (error) {
    // 분석 컬럼 마이그레이션(2026_09_25)이 아직 안 깔린 DB 면 새 컬럼이 거부된다 —
    // 그 사이에도 방문 기록이 끊기면 안 되므로 기존 컬럼만으로 한 번 더 시도한다.
    const { error: legacyError } = await admin
      .from("site_visits")
      .upsert(baseRow, { onConflict: "ip,date", ignoreDuplicates: true });
    if (legacyError) {
      console.warn("[api/visits] insert failed:", legacyError.message);
      return jsonOk({ success: false });
    }
    console.warn("[api/visits] analytics columns missing, stored legacy row:", error.message);
  }

  // 방문 급증 감지(#1161) — 실패해도 방문 기록엔 영향 없어야 하므로 통째로 삼킨다
  await maybeNotifyTrafficSpike(admin, today).catch((e) =>
    console.warn("[api/visits] spike check failed:", e instanceof Error ? e.message : e),
  );

  return jsonOk({ success: true });
}

/** 오늘 방문이 직전 7일 평균의 3배 이상이면 admin 알림을 만든다. 하루 한 번만. */
async function maybeNotifyTrafficSpike(admin: SupabaseClient, today: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const [todayRes, prevRes] = await Promise.all([
    admin
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .eq("date", today)
      .or(HUMAN_VISITS_FILTER),
    admin
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .gte("date", weekAgoStr)
      .lt("date", today)
      .or(HUMAN_VISITS_FILTER),
  ]);

  const todayCount = todayRes.count ?? 0;
  const prev7Total = prevRes.count ?? 0;
  if (!isTrafficSpike(todayCount, prev7Total)) return;

  // 하루 한 번만 — 오늘 이미 만든 급증 알림이 있으면 끝
  const { data: existing } = await admin
    .from("admin_notifications")
    .select("id")
    .eq("type", "traffic_spike")
    .gte("created_at", `${today}T00:00:00Z`)
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

/** VisitTracker 가 보낸 랜딩 경로·쿼리에서 path 와 UTM 을 뽑는다. 실패·비정상 값은 전부 null. */
async function parseLanding(request: Request): Promise<{
  path: string | null;
  utm: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null };
}> {
  const utm = { utm_source: null as string | null, utm_medium: null as string | null, utm_campaign: null as string | null };
  try {
    const body = await request.json();
    const rawPath = typeof body?.path === "string" ? body.path : "";
    // 경로는 / 로 시작하는 것만, 200자 제한 — 조작된 값이 대시보드에 그대로 뜨는 면을 줄인다
    const path = rawPath.startsWith("/") ? rawPath.slice(0, 200) : null;
    const rawSearch = typeof body?.search === "string" ? body.search.slice(0, 500) : "";
    if (rawSearch) {
      const params = new URLSearchParams(rawSearch);
      const pick = (k: string) => {
        const v = (params.get(k) ?? "").trim().slice(0, 100);
        return v || null;
      };
      utm.utm_source = pick("utm_source");
      utm.utm_medium = pick("utm_medium");
      utm.utm_campaign = pick("utm_campaign");
    }
    return { path, utm };
  } catch {
    return { path: null, utm };
  }
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
