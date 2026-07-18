import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/posts/[id]/related-works — 공개 detail 페이지용. published=true 만 반환. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: rels } = await admin
    .from("post_work_relations")
    .select("work_id")
    .eq("post_id", id);

  const workIds = (rels ?? []).map((r) => r.work_id as string);
  if (workIds.length === 0) return NextResponse.json({ items: [] });

  const { data: works } = await admin
    .from("works")
    .select("id, slug, title, title_en, subtitle_ko, subtitle_en, year, image, categories_ko, categories_en, nature_ko, nature_en")
    .in("id", workIds)
    .eq("published", true)
    .is("deleted_at", null);

  return NextResponse.json({ items: works ?? [] });
}
