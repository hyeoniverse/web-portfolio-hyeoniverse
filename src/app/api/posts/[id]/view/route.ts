import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/view — 조회수 증가
// 누적 카운터(posts.view_count) +1 + 시계열 기록(post_views) 1행 insert.
// 시계열은 일별 추세 차트(daily_post_views RPC)에 사용됨.
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: post } = await admin
    .from("posts")
    .select("view_count")
    .eq("id", id)
    .single();

  if (post) {
    await Promise.all([
      admin
        .from("posts")
        .update({ view_count: (post.view_count ?? 0) + 1 })
        .eq("id", id),
      admin
        .from("post_views")
        .insert({ post_id: id }),
    ]);
  }

  return NextResponse.json({ success: true });
}
