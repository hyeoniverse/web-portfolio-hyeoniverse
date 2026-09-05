import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { requirePostAccess } from "@/lib/api/requirePostAccess";

/* 이 작업물을 편집할 수 있는 사람만 그 연결도 다룰 수 있다. requireAuth 만 걸려 있던 동안에는
   로그인한 멤버 누구나 남의 작업물의 연결을 통째로 갈아치울 수 있었다 — 연결 테이블의 정책은
   is_member() 라 RLS 도 막지 못한다. 이 엔드포인트는 에디터에서만 쓰므로 편집 권한과 같게 맞춘다. */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/works/[id]/related-posts
 * 해당 work 에 연결된 posts 간단 정보 반환.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requirePostAccess("works", id);
  if (authError) return authError;

  const { data: rels, error: relErr } = await supabase
    .from("post_work_relations")
    .select("post_id")
    .eq("work_id", id);

  if (relErr) return jsonServerError(relErr, "GET /api/admin/works/[id]/related-posts");

  const postIds = (rels ?? []).map((r) => r.post_id as string);
  if (postIds.length === 0) return NextResponse.json({ items: [] });

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, cover_image, published, deleted_at")
    .in("id", postIds)
    .is("deleted_at", null);

  return NextResponse.json({
    items: (posts ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      cover_image: p.cover_image,
      published: p.published,
    })),
  });
}

/**
 * PUT /api/admin/works/[id]/related-posts
 * Body: { postIds: string[] }
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requirePostAccess("works", id);
  if (authError) return authError;

  const body = await request.json();
  const postIds: string[] = Array.isArray(body.postIds)
    ? body.postIds.filter((x: unknown) => typeof x === "string")
    : [];


  await supabase.from("post_work_relations").delete().eq("work_id", id);

  if (postIds.length > 0) {
    const rows = postIds.map((postId) => ({ post_id: postId, work_id: id }));
    const { error } = await supabase.from("post_work_relations").insert(rows);
    if (error) return jsonServerError(error, "PUT /api/admin/works/[id]/related-posts");
  }

  return NextResponse.json({ success: true, postIds });
}
