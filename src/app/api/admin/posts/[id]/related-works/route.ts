import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { requirePostAccess } from "@/lib/api/requirePostAccess";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/posts/[id]/related-works
 * 해당 post 에 연결된 works 의 간단한 정보 반환 (id, title, slug, published, image)
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  /* 어떤 글에 어떤 작업물을 붙일지는 그 글에 대한 쓰기다 — 자기 글만. */
  const { supabase, error: authError } = await requirePostAccess("posts", id);
  if (authError) return authError;

  const { data: rels, error: relErr } = await supabase
    .from("post_work_relations")
    .select("work_id")
    .eq("post_id", id);

  if (relErr) return jsonServerError(relErr, "GET /api/admin/posts/[id]/related-works");

  const workIds = (rels ?? []).map((r) => r.work_id as string);
  if (workIds.length === 0) return NextResponse.json({ items: [] });

  const { data: works } = await supabase
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
  /* 어떤 글에 어떤 작업물을 붙일지는 그 글에 대한 쓰기다 — 자기 글만. */
  const { supabase, error: authError } = await requirePostAccess("posts", id);
  if (authError) return authError;

  const body = await request.json();
  const workIds: string[] = Array.isArray(body.workIds)
    ? body.workIds.filter((x: unknown) => typeof x === "string")
    : [];


  // 1) 기존 관계 모두 삭제
  await supabase.from("post_work_relations").delete().eq("post_id", id);

  // 2) 새 관계 일괄 insert
  if (workIds.length > 0) {
    const rows = workIds.map((workId) => ({ post_id: id, work_id: workId }));
    const { error } = await supabase.from("post_work_relations").insert(rows);
    if (error) return jsonServerError(error, "PUT /api/admin/posts/[id]/related-works");
  }

  return NextResponse.json({ success: true, workIds });
}
