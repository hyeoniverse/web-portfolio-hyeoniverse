import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/view — 조회수 증가
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  // 현재 view_count 조회 후 +1
  const { data: post } = await admin
    .from("posts")
    .select("view_count")
    .eq("id", id)
    .single();

  if (post) {
    await admin
      .from("posts")
      .update({ view_count: (post.view_count ?? 0) + 1 })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
