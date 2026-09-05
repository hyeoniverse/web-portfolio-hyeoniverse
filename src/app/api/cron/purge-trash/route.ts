import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/purge-trash
 * Vercel Cron 이 daily 호출. purge_after < NOW() 인 posts/works 를 hard delete.
 * 보안: x-vercel-cron 헤더 또는 CRON_SECRET Authorization 헤더.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  if (!isVercelCron) {
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return jsonError("Unauthorized", 401);
    }
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // posts hard delete — deleted_at IS NOT NULL + purge_after < NOW()
  const { data: deletedPosts, error: postsErr } = await admin
    .from("posts")
    .delete()
    .not("deleted_at", "is", null)
    .lt("purge_after", now)
    .select("id");

  if (postsErr) {
    return jsonServerError(postsErr, "GET /api/cron/purge-trash");
  }

  const { data: deletedWorks, error: worksErr } = await admin
    .from("works")
    .delete()
    .not("deleted_at", "is", null)
    .lt("purge_after", now)
    .select("id");

  if (worksErr) {
    return jsonServerError(worksErr, "GET /api/cron/purge-trash");
  }

  // calendars hard delete — deleted_at IS NOT NULL + purge_after < NOW()
  const { data: deletedCalendars, error: calErr } = await admin
    .from("calendars")
    .delete()
    .not("deleted_at", "is", null)
    .lt("purge_after", now)
    .select("id");

  if (calErr) {
    return jsonServerError(calErr, "GET /api/cron/purge-trash");
  }

  return NextResponse.json({
    success: true,
    postsPurged: deletedPosts?.length ?? 0,
    worksPurged: deletedWorks?.length ?? 0,
    calendarsPurged: deletedCalendars?.length ?? 0,
  });
}
