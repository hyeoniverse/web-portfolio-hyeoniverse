import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";

/** GET /api/admin/works-categories — works.categories_en 사용 카운트 + 카테고리별 work 목록 (admin 전용).
 *  works 는 multi-category (text[]) 라 한 work 가 여러 카테고리에 매칭됨.
 *  response: {
 *    categories: string[]    // EN canonical 들 distinct
 *    counts: Record<string, number>
 *    works: Array<{ id, title, categories: string[], slug }>
 *  } */
type WorkRow = {
  id: string;
  title: string | null;
  categories_en: string[] | null;
  slug: string | null;
  published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function GET() {
  /* 작업물 카테고리 집계 — works 자체가 admin 이상 전용이라 같은 등급으로 맞춘다. */
  const { supabase, error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const { data, error } = await supabase
    .from("works")
    .select("id, title, categories_en, slug, published, created_at, updated_at")
    .is("deleted_at", null)
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const works = (data ?? []) as WorkRow[];
  const counts: Record<string, number> = {};
  for (const w of works) {
    if (!w.categories_en) continue;
    for (const c of w.categories_en) {
      if (!c) continue;
      counts[c] = (counts[c] ?? 0) + 1;
    }
  }

  const categories = Object.keys(counts).sort((a, b) => a.localeCompare(b, "ko"));
  return NextResponse.json({
    categories,
    counts,
    works: works.map((w) => ({
      id: w.id,
      title: w.title ?? "",
      categories: w.categories_en ?? [],
      slug: w.slug ?? "",
      published: !!w.published,
      published_at: null,
      created_at: w.created_at,
      updated_at: w.updated_at,
    })),
  });
}
