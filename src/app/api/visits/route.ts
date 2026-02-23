import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// GET /api/visits — today + total 방문자 수
export async function GET() {
  const admin = createAdminClient();

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [todayResult, totalResult] = await Promise.all([
    admin
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .eq("date", today),
    admin
      .from("site_visits")
      .select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    today: todayResult.count ?? 0,
    total: totalResult.count ?? 0,
  });
}

// POST /api/visits — 방문 기록 (IP + date upsert)
export async function POST(request: Request) {
  const ip = getIp(request);
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // upsert: ip+date 중복이면 무시
  await admin
    .from("site_visits")
    .upsert(
      { ip, date: today },
      { onConflict: "ip,date", ignoreDuplicates: true }
    );

  return NextResponse.json({ success: true });
}
