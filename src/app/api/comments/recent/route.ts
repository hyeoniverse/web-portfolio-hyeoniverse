import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/comments/recent?limit=5
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 5, 20);

  const admin = createAdminClient();

  const { data: comments, error } = await admin
    .from("comments")
    .select("id, post_id, nickname, content, is_admin, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!comments || comments.length === 0) {
    return NextResponse.json([]);
  }

  // post 정보 조인
  const postIds = [...new Set(comments.map((c) => c.post_id))];
  const { data: posts } = await admin
    .from("posts")
    .select("id, title, slug")
    .in("id", postIds);

  const postMap = new Map(
    (posts ?? []).map((p) => [p.id, { title: p.title, slug: p.slug }])
  );

  const result = comments.map((c) => {
    const post = postMap.get(c.post_id);
    return {
      id: c.id,
      nickname: c.nickname,
      content: c.content.length > 100 ? c.content.slice(0, 100) + "…" : c.content,
      is_admin: c.is_admin,
      created_at: c.created_at,
      post_title: post?.title ?? "",
      post_slug: post?.slug ?? "",
    };
  });

  return NextResponse.json(result);
}
