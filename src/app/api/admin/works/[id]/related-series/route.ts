import { NextResponse } from "next/server";
import { requirePostAccess } from "@/lib/api/requirePostAccess";

/* 이 작업물을 편집할 수 있는 사람만 그 연결도 다룰 수 있다. requireAuth 만 걸려 있던 동안에는
   로그인한 멤버 누구나 남의 작업물의 연결을 통째로 갈아치울 수 있었다 — 연결 테이블의 정책은
   is_member() 라 RLS 도 막지 못한다. 이 엔드포인트는 에디터에서만 쓰므로 편집 권한과 같게 맞춘다. */
interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/works/[id]/related-series — 연결된 시리즈 간단 정보. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requirePostAccess("works", id);
  if (authError) return authError;
  const { data: rels, error: relErr } = await supabase
    .from("series_work_relations")
    .select("series_id")
    .eq("work_id", id);

  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 });

  const seriesIds = (rels ?? []).map((r) => r.series_id as string);
  if (seriesIds.length === 0) return NextResponse.json({ items: [] });

  const { data: series } = await supabase
    .from("series")
    .select("id, title, title_en, slug, cover_image, category, published")
    .in("id", seriesIds);

  return NextResponse.json({ items: series ?? [] });
}

/** PUT /api/admin/works/[id]/related-series — Body: { seriesIds: string[] } */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requirePostAccess("works", id);
  if (authError) return authError;

  const body = await request.json();
  const seriesIds: string[] = Array.isArray(body.seriesIds)
    ? body.seriesIds.filter((x: unknown) => typeof x === "string")
    : [];
  await supabase.from("series_work_relations").delete().eq("work_id", id);

  if (seriesIds.length > 0) {
    const rows = seriesIds.map((seriesId) => ({ series_id: seriesId, work_id: id }));
    const { error } = await supabase.from("series_work_relations").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, seriesIds });
}
