import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/requireAuth";

/**
 * POST /api/posts/reassign-category
 *
 * Mode 1 — 일괄 재할당:
 *   { from: string, to: string }
 *
 * Mode 2 — 개별 재할당:
 *   { assignments: [{ id: string, category: string }] }
 */
export async function POST(request: Request) {
  // 인증 필수 — posts.category 를 대량 변경하므로 (기존 auth 누락 구멍 방지).
  // 어떤 글이 바뀌는지는 세션 클라이언트 + RLS 가 정한다 — 저자는 자기 글만.
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();


  // Mode 2: per-post assignments
  if (Array.isArray(body.assignments)) {
    const assignments: { id: string; category: string }[] = body.assignments;
    if (assignments.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // Group by target category for batch updates
    const groups = new Map<string, string[]>();
    for (const { id, category } of assignments) {
      const ids = groups.get(category) ?? [];
      ids.push(id);
      groups.set(category, ids);
    }

    let updated = 0;
    for (const [category, ids] of groups) {
      const { error } = await supabase
        .from("posts")
        .update({ category })
        .in("id", ids);
      if (error) {
        return jsonServerError(error, "POST /api/posts/reassign-category");
      }
      updated += ids.length;
    }

    return NextResponse.json({ updated });
  }

  // Mode 1: bulk from → to
  const { from, to } = body;

  if (!from || !to) {
    return jsonError("from and to are required", 400);
  }

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("category", from);

  if (!count) {
    return NextResponse.json({ updated: 0 });
  }

  const { error } = await supabase
    .from("posts")
    .update({ category: to })
    .eq("category", from);

  if (error) {
    return jsonServerError(error, "POST /api/posts/reassign-category");
  }

  return NextResponse.json({ updated: count });
}
