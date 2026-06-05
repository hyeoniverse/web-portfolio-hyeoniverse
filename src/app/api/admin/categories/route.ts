import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

/** GET /api/admin/categories — 게시물의 카테고리 사용 카운트 + 카테고리별 게시물 목록 (admin 전용).
 *  response: {
 *    categories: string[],
 *    counts: Record<string, number>,
 *    posts: Array<{ id, title, title_en, category, slug }>
 *  }
 *  category = post.category (단일 string, BilingualCategory 의 EN canonical 과 매칭) */
type PostRow = {
  id: string;
  title: string | null;
  title_en: string | null;
  category: string | null;
  slug: string | null;
  published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  view_count: number | null;
  tags: string[] | null;
};

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select("id, title, title_en, category, slug, published, created_at, updated_at, view_count, tags")
    .is("deleted_at", null)
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = (data ?? []) as PostRow[];
  const counts: Record<string, number> = {};
  for (const p of posts) {
    if (!p.category) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }

  const categories = Object.keys(counts).sort((a, b) => a.localeCompare(b, "ko"));
  return NextResponse.json({
    categories,
    counts,
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title ?? "",
      title_en: p.title_en ?? "",
      category: p.category ?? "",
      slug: p.slug ?? "",
      published: !!p.published,
      published_at: null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      view_count: p.view_count ?? 0,
      tags: p.tags ?? [],
    })),
  });
}
