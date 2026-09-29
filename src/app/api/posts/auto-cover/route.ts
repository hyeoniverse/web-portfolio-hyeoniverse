/**
 * /api/posts/auto-cover — 발행됐고 cover_image 가 비어 있는 글에 키워드 기반 cover 자동 배정
 * (Unsplash → Pexels). 이미 커버가 있는 글은 건드리지 않는다. GET 으로 대상을 먼저 보고, POST 로 적용한다.
 *
 * 응답: { processed: number, succeeded: number, failed: number, items: [...] }
 */

import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/requireAuth";
import { fetchAutoCoverImage, extractKeywordsFromPost } from "@/lib/autoCoverImage";

/** 적용 대상 — 발행됐고, 휴지통에 없고, 커버가 비어 있는 글 */
async function loadTargets(supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"]) {
  const { data: posts, error } = await supabase!
    .from("posts")
    .select("id, slug, tags, category, title, title_en, cover_image, published, deleted_at, created_at")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return { error };
  return { targets: (posts ?? []).filter((p) => !p.cover_image) };
}

/**
 * GET — 적용하기 전에 대상 글을 미리 본다(설정 › 서비스의 확인 창). 이미지는 찾지 않는다 —
 * 찾으면 Unsplash 요청 한도(시간당 50회)를 미리보기에서 다 쓴다. 글마다 검색할 키워드만 돌려준다.
 */
export async function GET() {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;
  const r = await loadTargets(supabase);
  if ("error" in r && r.error) return jsonServerError(r.error, "GET /api/posts/auto-cover");
  return NextResponse.json({
    items: r.targets!.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title ?? "",
      category: p.category ?? "",
      keywords: extractKeywordsFromPost(p),
    })),
  });
}

/** POST { ids? } — ids 가 있으면 그 글만(확인 창에서 고른 것). 그래도 커버가 비어 있는 글만 채운다 */
export async function POST(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
  const only = Array.isArray(body.ids) ? new Set(body.ids.filter((v): v is string => typeof v === "string")) : null;

  const r = await loadTargets(supabase);
  if ("error" in r && r.error) return jsonServerError(r.error, "POST /api/posts/auto-cover");

  /* cover-less 만 — 고른 글이 있으면 그 가운데서 */
  const targets = r.targets!.filter((p) => !only || only.has(p.id));
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
        await supabase.from("posts").update({ cover_image: url }).eq("id", post.id);
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
