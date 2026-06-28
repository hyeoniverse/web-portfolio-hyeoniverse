import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/works/[id]/related-series — 연결된 시리즈 간단 정보. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data: rels, error: relErr } = await admin
    .from("series_work_relations")
    .select("series_id")
    .eq("work_id", id);

  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 });

  const seriesIds = (rels ?? []).map((r) => r.series_id as string);
  if (seriesIds.length === 0) return NextResponse.json({ items: [] });

  const { data: series } = await admin
    .from("series")
    .select("id, title, title_en, slug, cover_image, category, published")
    .in("id", seriesIds);

  return NextResponse.json({ items: series ?? [] });
}

/** PUT /api/admin/works/[id]/related-series — Body: { seriesIds: string[] } */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const seriesIds: string[] = Array.isArray(body.seriesIds)
    ? body.seriesIds.filter((x: unknown) => typeof x === "string")
    : [];

  const admin = createAdminClient();
  await admin.from("series_work_relations").delete().eq("work_id", id);

  if (seriesIds.length > 0) {
    const rows = seriesIds.map((seriesId) => ({ series_id: seriesId, work_id: id }));
    const { error } = await admin.from("series_work_relations").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, seriesIds });
}
