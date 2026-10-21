import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/api/cronAuth";

/**
 * GET /api/cron/publish-scheduled
 * Vercel Cron 또는 외부 스케줄러가 주기적으로 호출 (vercel.json schedule 참고).
 * `publish_scheduled()` RPC 를 실행해 scheduled_at <= now() 인 posts/works 를
 * 일괄로 published=true 로 flip 한다.
 *
 * 보안: `Authorization: Bearer ${CRON_SECRET}` 만 받는다(lib/api/cronAuth).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return jsonError("Unauthorized", 401);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("publish_scheduled");

  if (error) {
    return jsonServerError(error, "GET /api/cron/publish-scheduled");
  }

  return NextResponse.json({
    success: true,
    publishedCount: (data ?? []).length,
    items: data ?? [],
  });
}
