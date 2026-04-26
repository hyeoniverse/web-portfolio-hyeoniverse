import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/publish-scheduled
 * Vercel Cron 또는 외부 스케줄러가 주기적으로 호출 (vercel.json schedule 참고).
 * `publish_scheduled()` RPC 를 실행해 scheduled_at <= now() 인 posts/works 를
 * 일괄로 published=true 로 flip 한다.
 *
 * 보안: Vercel Cron 은 자동으로 헤더 `x-vercel-cron: 1` 을 붙임.
 * 그 외 경로에서 호출 시 CRON_SECRET 환경변수와 비교.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  if (!isVercelCron) {
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("publish_scheduled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    publishedCount: (data ?? []).length,
    items: data ?? [],
  });
}
