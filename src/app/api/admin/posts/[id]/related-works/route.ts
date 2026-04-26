import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/posts/[id]/related-works
 * 해당 post 에 연결된 works 의 간단한 정보 반환 (id, title, slug, published, image)
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data: rels, error: relErr } = await admin
    .from("post_work_relations")
    .select("work_id")
    .eq("post_id", id);

  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 });

  const workIds = (rels ?? []).map((r) => r.work_id as string);
  if (workIds.length === 0) return NextResponse.json({ items: [] });

  const { data: works } = await admin
    .from("works")
    .select("id, title, year, image, published, deleted_at")
    .in("id", workIds)
    .is("deleted_at", null);

  return NextResponse.json({
    items: (works ?? []).map((w) => ({
      id: w.id,
      title: w.title,
      year: w.year,
      image: w.image,
      published: w.published,
    })),
  });
}

/**
 * PUT /api/admin/posts/[id]/related-works
 * Body: { workIds: string[] }
 * 해당 post 의 연결된 works 를 전체 교체.
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const workIds: string[] = Array.isArray(body.workIds)
    ? body.workIds.filter((x: unknown) => typeof x === "string")
    : [];

  const admin = createAdminClient();

  // 1) 기존 관계 모두 삭제
  await admin.from("post_work_relations").delete().eq("post_id", id);

  // 2) 새 관계 일괄 insert
  if (workIds.length > 0) {
    const rows = workIds.map((workId) => ({ post_id: id, work_id: workId }));
    const { error } = await admin.from("post_work_relations").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, workIds });
}
