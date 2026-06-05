import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePostCategory } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";
import { getPopularPostIds } from "@/lib/popularity";
import { fetchAutoCoverImage, extractKeywordsFromPost } from "@/lib/autoCoverImage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/posts/[id] — 단일 포스트 (admin 전용 — 비공개/휴지통 포함 raw 조회).
// 공개 페이지는 slug 기반(getPostBySlug)으로 조회. id 기반 직접 접근은 admin preview/editor 에서만 사용.
export async function GET(_request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/posts/[id] — 포스트 수정 (admin only)
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();

  // 카테고리 직접 입력 시 자동 등록 (기존 목록에 없으면)
  if (body.category) {
    await ensurePostCategory(body.category as string);
  }

  const admin = createAdminClient();

  /* 발행 자동 cover 배정: published=true 로 전환(또는 이미 published) 인데 cover_image 가 비어 있으면
     키워드 기반으로 Unsplash/Pexels 검색해서 cover_image 자동 채움. 한 번 채워지면 다시 호출 안 함. */
  if (body.published === true) {
    const { data: cur } = await admin
      .from("posts")
      .select("cover_image, tags, category, title, title_en")
      .eq("id", id)
      .maybeSingle();

    const incomingCover = typeof body.cover_image === "string" ? body.cover_image : undefined;
    const effectiveCover = incomingCover !== undefined ? incomingCover : (cur?.cover_image ?? "");

    if (!effectiveCover) {
      try {
        const merged = {
          tags: (body.tags as string[]) ?? cur?.tags ?? [],
          category: (body.category as string) ?? cur?.category ?? "",
          title: (body.title as string) ?? cur?.title ?? "",
          title_en: (body.title_en as string) ?? cur?.title_en ?? "",
        };
        const kws = extractKeywordsFromPost(merged);
        const url = await fetchAutoCoverImage({ keywords: kws });
        if (url) body.cover_image = url;
      } catch { /* graceful — 자동 배정 실패는 발행 자체를 막지 않음 */ }
    }
  }

  const { data, error } = await admin
    .from("posts")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/posts/[id] — 휴지통으로 이동 (소프트 삭제, admin only)
// 인기글 (score top 5 — lib/popularity) 은 90일, 일반은 30일 후 자동 영구삭제
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const popularIds = await getPopularPostIds(admin, 5);
  const isPopular = popularIds.has(id);
  const retentionDays = isPopular ? 90 : 30;
  const purgeAfter = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("posts")
    .update({
      deleted_at: new Date().toISOString(),
      purge_after: purgeAfter,
      published: false,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, retentionDays });
}
