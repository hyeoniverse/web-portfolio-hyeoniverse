import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { SERIES_TITLE_MAX } from "@/types/post";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/series/[id] — 단일 시리즈 + 소속 포스트 목록
// 비공개 시리즈는 로그인된 사용자만 조회 가능 (info leak 방지)
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  /* 세션(없으면 anon) 클라이언트로 읽는다. 예전에는 service_role 이라 공개 시리즈에 딸린
     **미발행 글**의 제목·발췌까지 아무에게나 나갔다. 이제 posts_public_read 가 걸러 준다. */
  const supabase = await createClient();

  const { data: series, error } = await supabase
    .from("series")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !series) return jsonError("Series not found", 404);

  // 비공개면 auth 필요
  if (!series.published) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Series not found", 404);
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, excerpt_en, published, series_order, created_at, title_en, cover_image, tags, category")
    .eq("series_id", id)
    .order("series_order", { ascending: true });

  return jsonOk({ ...series, posts: posts ?? [] });
}

// PATCH /api/series/[id] — 시리즈 수정 (admin only)
// ?skipShift=true → drag 의 batch 호출이 자체 정렬을 관리하므로 auto-shift 건너뜀
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();

  // 제목(ko/en) 길이 검증 — partial update 라 존재할 때만. UI/폼 우회 방어.
  if (typeof body.title === "string" && body.title.length > SERIES_TITLE_MAX)
    return jsonError(`title must be ${SERIES_TITLE_MAX} characters or fewer`, 400);
  if (typeof body.title_en === "string" && body.title_en.length > SERIES_TITLE_MAX)
    return jsonError(`title_en must be ${SERIES_TITLE_MAX} characters or fewer`, 400);

  const url = new URL(request.url);
  const skipShift = url.searchParams.get("skipShift") === "true";

  // 시리즈는 자기 카테고리를 갖지 않음(멤버 글에서 도출) — category 쓰기 경로 제거.


  // sort_order 변경 시 — 다른 시리즈들과 충돌 방지로 shift (skipShift 모드 제외)
  if (!skipShift && body.sort_order !== undefined && body.sort_order !== null) {
    const { data: cur } = await supabase
      .from("series")
      .select("sort_order")
      .eq("id", id)
      .maybeSingle();
    const oldOrder = cur?.sort_order;
    const newOrder = body.sort_order as number;
    if (oldOrder !== undefined && oldOrder !== newOrder) {
      // 이동 범위에 있는 다른 시리즈들 +1 / -1
      const lo = Math.min(oldOrder, newOrder);
      const hi = Math.max(oldOrder, newOrder);
      const direction = oldOrder < newOrder ? -1 : 1;
      const { data: affected } = await supabase
        .from("series")
        .select("id, sort_order")
        .neq("id", id)
        .gte("sort_order", lo)
        .lte("sort_order", hi);
      if (affected) {
        // 각 행의 새 sort_order 가 row 별로 다르므로 PostgREST 단일 UPDATE 불가 — 병렬 호출로 round-trip 단축
        await Promise.all(
          affected.map((row) =>
            supabase
              .from("series")
              .update({ sort_order: row.sort_order + direction })
              .eq("id", row.id),
          ),
        );
      }
    }
  }

  const { data, error } = await supabase
    .from("series")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonServerError(error, "PATCH /api/series/[id]");

  return jsonOk(data);
}

// DELETE /api/series/[id]?deletePosts=true — 시리즈 삭제 (admin only)
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const deletePosts = searchParams.get("deletePosts") === "true";

  if (deletePosts) {
    // 하위 포스트도 soft delete
    await supabase.from("posts").update({ deleted_at: new Date().toISOString(), series_id: null, series_order: 0 }).eq("series_id", id);
  } else {
    // 소속 포스트의 series_id를 null로 초기화
    await supabase.from("posts").update({ series_id: null, series_order: 0 }).eq("series_id", id);
  }

  const { error } = await supabase.from("series").delete().eq("id", id);

  if (error) return jsonServerError(error, "DELETE /api/series/[id]");

  return jsonOk({ success: true });
}
