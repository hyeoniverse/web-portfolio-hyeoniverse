/**
 * POST /api/posts/auto-cover — published 인데 cover_image 비어있는 모든 글에
 * 키워드 기반 cover 자동 배정 (Unsplash/Pexels). 한 번 채워진 글은 건너뜀.
 *
 * 응답: { processed: number, succeeded: number, failed: number, items: [...] }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { fetchAutoCoverImage, extractKeywordsFromPost } from "@/lib/autoCoverImage";

export async function POST() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();

  const { data: posts, error } = await admin
    .from("posts")
    .select("id, tags, category, title, title_en, cover_image, published, deleted_at")
    .eq("published", true)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* cover-less 만 필터 */
  const targets = (posts ?? []).filter((p) => !p.cover_image);
  if (targets.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, items: [] });
  }

  let succeeded = 0;
  let failed = 0;
  const items: { id: string; title: string; url: string | null }[] = [];

  /* 직렬 처리 — Unsplash 무료 50req/h rate limit, 병렬 시 throttle 위험 */
  for (const post of targets) {
    try {
      const kws = extractKeywordsFromPost(post);
      const url = await fetchAutoCoverImage({ keywords: kws });
      if (url) {
        await admin.from("posts").update({ cover_image: url }).eq("id", post.id);
        succeeded++;
        items.push({ id: post.id, title: post.title ?? "", url });
      } else {
        failed++;
        items.push({ id: post.id, title: post.title ?? "", url: null });
      }
    } catch {
      failed++;
      items.push({ id: post.id, title: post.title ?? "", url: null });
    }
  }

  return NextResponse.json({
    processed: targets.length,
    succeeded,
    failed,
    items,
  });
}
