import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/work-comments/recent?limit=8
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get(QUERY_PARAM.limit)) || 8, 20);

  const admin = createAdminClient();

  const { data: comments, error } = await admin
    .from("work_comments")
    .select("id, work_id, nickname, content, is_admin, is_deleted, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!comments || comments.length === 0) {
    return NextResponse.json([]);
  }

  const workIds = [...new Set(comments.map((c) => c.work_id))];
  const { data: works } = await admin
    .from("works")
    .select("id, title")
    .in("id", workIds);

  const workMap = new Map(
    (works ?? []).map((w) => [w.id, { title: w.title }]),
  );

  const result = comments.map((c) => {
    const work = workMap.get(c.work_id);
    return {
      id: c.id,
      work_id: c.work_id,
      nickname: c.nickname,
      content: c.content.length > 60 ? c.content.slice(0, 60) + "…" : c.content,
      is_admin: c.is_admin,
      created_at: c.created_at,
      work_title: work?.title ?? "",
    };
  });

  return NextResponse.json(result);
}
