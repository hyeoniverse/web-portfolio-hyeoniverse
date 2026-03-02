import { createAdminClient } from "@/lib/supabase/admin";
import { getIp } from "@/utils/getIp";
import { jsonOk } from "@/lib/api/response";

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

// POST /api/visits — 방문 기록 (IP + date upsert)
export async function POST(request: Request) {
  const ip = getIp(request);
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  await admin
    .from("site_visits")
    .upsert({ ip, date: today }, { onConflict: "ip,date", ignoreDuplicates: true });

  return jsonOk({ success: true });
}
