import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { revalidatePath } from "next/cache";
import { titleTooLong, POST_TITLE_MAX } from "@/lib/postConstants";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePostCategory } from "@/lib/api/validateCategory";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";
import { getPopularPostIds } from "@/lib/popularity";
import { fetchAutoCoverImage, extractKeywordsFromPost } from "@/lib/autoCoverImage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/* 발행/수정/삭제 후 공개 페이지 캐시를 즉시 무효화 — page 의 revalidate=60(ISR) 을 기다리지 않고 바로 반영.
   목록(/posts)·홈(/)·해당 상세(/posts/[slug]) 를 revalidate. */
function revalidatePublicPosts(slug?: string | null) {
  revalidatePath("/posts");
  revalidatePath("/");
  if (slug) revalidatePath(`/posts/${slug}`);
}

// GET /api/posts/[id] — 단일 포스트 (admin 전용 — 비공개/휴지통 포함 raw 조회).
// 공개 페이지는 slug 기반(getPostBySlug)으로 조회. id 기반 직접 접근은 admin preview/editor 에서만 사용.
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  /* 조회 범위는 posts_admin_select 정책이 정하고, 그 조건은 편집 권한과 같은 can_edit_post 다.
     그래서 접근 확인도 같은 규칙으로 한다 — 없는 글은 404, 권한이 없는 글은 403 이 된다.
     (세션 클라이언트로만 판정하면 둘 다 0행이라 있는 글에도 "없음" 이라고 답하게 된다) */
  const { supabase, error: accessError } = await requirePostAccess("posts", id);
  if (accessError) return accessError;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return policyBlocked();

  return NextResponse.json(data);
}

// PATCH /api/posts/[id] — 포스트 수정 (admin only)
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  /* 인증만으로는 부족하다 — author(레벨 1)는 자기 글만 고칠 수 있어야 한다.
     여기서 받은 세션 클라이언트로 이어서 쓰므로 실제 UPDATE 도 정책의 검사를 받는다. */
  const { supabase, error: accessError } = await requirePostAccess("posts", id);
  if (accessError) return accessError;

  const body = await request.json();

  // 제목 길이 제한 (UI·DB 와 동일 상한)
  if (titleTooLong(body.title) || titleTooLong(body.title_en)) {
    return jsonError(`title exceeds ${POST_TITLE_MAX} characters`, 400, { code: "POST_TITLE_TOO_LONG", params: { max: POST_TITLE_MAX } });
  }

  // 낙관적 동시성 제어 — 에디터가 로드 시점 version 을 baseVersion 으로 보냄. 컬럼이 아니므로 분리.
  const baseVersion = typeof body.baseVersion === "number" ? body.baseVersion : null;
  delete body.baseVersion;

  // 카테고리 직접 입력 시 자동 등록 (기존 목록에 없으면)
  if (body.category) {
    await ensurePostCategory(body.category as string);
  }

  /* 발행 자동 cover 배정: published=true 로 전환(또는 이미 published) 인데 cover_image 가 비어 있으면
     키워드 기반으로 Unsplash/Pexels 검색해서 cover_image 자동 채움. 한 번 채워지면 다시 호출 안 함. */
  if (body.published === true) {
    const { data: cur } = await supabase
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

  // baseVersion 이 있으면 조건부 갱신(버전 일치할 때만) + version 증가.
  if (baseVersion !== null) {
    const { data, error } = await supabase
      .from("posts")
      // updated_at 명시 갱신 — 자동저장 복원이 "마지막 저장보다 새 draft 만" 되돌리도록 신뢰 가능한 저장시각 필요.
      .update({ ...body, version: baseVersion + 1, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("version", baseVersion)
      .select()
      .single();

    if (error) {
      // 0행 갱신(PGRST116) = 없거나 version 불일치. 현재 version 확인해 충돌/404 구분.
      if (error.code === "PGRST116") {
        const { data: cur } = await supabase.from("posts").select("version").eq("id", id).maybeSingle();
        if (cur) {
          return NextResponse.json({ error: "version_conflict", currentVersion: cur.version }, { status: 409 });
        }
        return policyBlocked();   // 존재·권한은 requirePostAccess 가 확인했다
      }
      return jsonServerError(error, "PATCH /api/posts/[id]");
    }
    revalidatePublicPosts(data?.slug);
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("posts")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // 0행 갱신 = 정책이 막은 것이다. 존재와 권한은 requirePostAccess 가 이미 확인했다.
    if (error.code === "PGRST116") return policyBlocked();
    return jsonServerError(error, "PATCH /api/posts/[id]");
  }

  revalidatePublicPosts(data?.slug);
  return NextResponse.json(data);
}

// DELETE /api/posts/[id] — 휴지통으로 이동 (소프트 삭제, admin only)
// 인기글 (score top 5 — lib/popularity) 은 90일, 일반은 30일 후 자동 영구삭제
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: accessError } = await requirePostAccess("posts", id);
  if (accessError) return accessError;

  /* 인기글 판정은 사이트 전체를 훑는 계산이라 요청자 시야로 좁히면 안 된다 —
     저자 세션으로 읽으면 자기 글만 집계돼 보존 기간이 달라진다. 여기만 service_role 을 쓴다. */
  const popularIds = await getPopularPostIds(createAdminClient(), 5);
  const isPopular = popularIds.has(id);
  const retentionDays = isPopular ? 90 : 30;
  const purgeAfter = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("posts")
    .update({
      deleted_at: new Date().toISOString(),
      purge_after: purgeAfter,
      published: false,
    })
    .eq("id", id);

  if (error) {
    return jsonServerError(error, "DELETE /api/posts/[id]");
  }

  revalidatePublicPosts();
  return NextResponse.json({ success: true, retentionDays });
}
