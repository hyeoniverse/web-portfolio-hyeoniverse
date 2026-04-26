import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/works/[id]/related-posts
 * 해당 work 에 연결된 posts 간단 정보 반환.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data: rels, error: relErr } = await admin
    .from("post_work_relations")
    .select("post_id")
    .eq("work_id", id);

  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 });

  const postIds = (rels ?? []).map((r) => r.post_id as string);
  if (postIds.length === 0) return NextResponse.json({ items: [] });

  const { data: posts } = await admin
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
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const postIds: string[] = Array.isArray(body.postIds)
    ? body.postIds.filter((x: unknown) => typeof x === "string")
    : [];

  const admin = createAdminClient();

  await admin.from("post_work_relations").delete().eq("work_id", id);

  if (postIds.length > 0) {
    const rows = postIds.map((postId) => ({ post_id: postId, work_id: id }));
    const { error } = await admin.from("post_work_relations").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, postIds });
}
