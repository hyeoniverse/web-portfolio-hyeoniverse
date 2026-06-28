import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/works/[id]/related-series — 공개 detail 페이지용. published=true 만. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: rels } = await admin
    .from("series_work_relations")
    .select("series_id")
    .eq("work_id", id);

  const seriesIds = (rels ?? []).map((r) => r.series_id as string);
  if (seriesIds.length === 0) return NextResponse.json({ items: [] });

  const { data: series } = await admin
    .from("series")
    .select("id, title, title_en, slug, cover_image, category, description, description_en")
    .in("id", seriesIds)
    .eq("published", true)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ items: series ?? [] });
}
