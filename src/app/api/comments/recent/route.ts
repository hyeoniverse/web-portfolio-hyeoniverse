import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/comments/recent?limit=5
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get(QUERY_PARAM.limit)) || 5, 20);

  const admin = createAdminClient();

  const { data: comments, error } = await admin
    .from("comments")
    .select("id, post_id, nickname, content, is_admin, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!comments || comments.length === 0) {
    return NextResponse.json([]);
  }

  /* post 정보 조인 — 공개 위젯이므로 발행 중인 글만 짚는다.
     필터가 없던 동안에는 나중에 비공개로 돌렸거나 휴지통에 넣은 글의 제목·슬러그가
     그대로 노출되고, 링크는 열리지 않는 곳을 가리켰다. */
  const postIds = [...new Set(comments.map((c) => c.post_id))];
  const { data: posts } = await admin
    .from("posts")
    .select("id, title, slug")
    .in("id", postIds)
    .eq("published", true)
    .is("deleted_at", null);

  const postMap = new Map(
    (posts ?? []).map((p) => [p.id, { title: p.title, slug: p.slug }])
  );

  /* 대상 글이 공개 상태가 아니면 댓글 자체를 빼는다 — 제목 없는 항목을 남기면
     "어딘가에 글이 있다" 는 사실만 흘리고 링크도 동작하지 않는다. */
  const result = comments.flatMap((c) => {
    const post = postMap.get(c.post_id);
    if (!post) return [];
    return [{
      id: c.id,
      nickname: c.nickname,
      content: c.content.length > 100 ? c.content.slice(0, 100) + "…" : c.content,
      is_admin: c.is_admin,
      created_at: c.created_at,
      post_title: post.title,
      post_slug: post.slug,
    }];
  });

  return NextResponse.json(result);
}
