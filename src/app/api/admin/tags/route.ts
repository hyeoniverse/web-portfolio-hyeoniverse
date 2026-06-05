import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

/** GET /api/admin/tags — 모든 게시물에서 distinct tag + 사용 횟수 + 태그별 post 목록 (admin 전용)
 *  response: {
 *    tags: string[],
 *    counts: Record<string, number>,
 *    posts: Array<{ id, title, title_en, tags, slug }>
 *  } */
type PostRow = {
  id: string;
  title: string | null;
  title_en: string | null;
  tags: string[] | null;
  slug: string | null;
  category: string | null;
  published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  view_count: number | null;
};

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select("id, title, title_en, tags, slug, category, published, created_at, updated_at, view_count")
    .is("deleted_at", null)
    .limit(1000);

  if (error) {
    console.error("/api/admin/tags supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (data ?? []) as PostRow[];
  const counts: Record<string, number> = {};
  for (const p of posts) {
    if (!p.tags) continue;
    for (const t of p.tags) {
      if (!t) continue;
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }

  const tags = Object.keys(counts).sort((a, b) => a.localeCompare(b, "ko"));
  return NextResponse.json({
    tags,
    counts,
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title ?? "",
      title_en: p.title_en ?? "",
      tags: p.tags ?? [],
      slug: p.slug ?? "",
      category: p.category ?? "",
      published: !!p.published,
      published_at: null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      view_count: p.view_count ?? 0,
    })),
  });
}
