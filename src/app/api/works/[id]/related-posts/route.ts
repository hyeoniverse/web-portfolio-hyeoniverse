import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/works/[id]/related-posts — 공개 detail 페이지용. published=true 만 반환. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: rels } = await admin
    .from("post_work_relations")
    .select("post_id")
    .eq("work_id", id);

  const postIds = (rels ?? []).map((r) => r.post_id as string);
  if (postIds.length === 0) return NextResponse.json({ items: [] });

  const { data: posts } = await admin
    .from("posts")
    .select("id, title, slug, cover_image, excerpt, category, created_at")
    .in("id", postIds)
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return NextResponse.json({ items: posts ?? [] });
}
