import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { SERIES_TITLE_MAX } from "@/types/post";
import { topPostCategory } from "@/lib/seriesCategory";
import { getUserRole } from "@/lib/api/roles";
import { createSeriesCover, isAutoSeriesCover, removeAutoSeriesCover } from "@/lib/seriesCover";
import { moveSeriesTo } from "@/lib/seriesOrder";

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

  if (error || !series) return jsonError("Series not found", 404, { code: "SERIES_NOT_FOUND" });

  // 비공개면 auth 필요
  if (!series.published) {
    const { data: { user } } = await supabase.auth.getUser();
    const role = getUserRole(user);
    if (!role.isOwner && role.role === null) return jsonError("Series not found", 404, { code: "SERIES_NOT_FOUND" });
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, excerpt_en, published, series_order, created_at, title_en, cover_image, tags, category")
    .eq("series_id", id)
    .order("series_order", { ascending: true });

  /* 카테고리는 소속 글에서 도출한다 — DB 컬럼은 #326 이전 값이 남은 legacy */
  return jsonOk({
    ...series,
    category: topPostCategory((posts ?? []).map((p) => p.category)),
    posts: posts ?? [],
  });
}

// PATCH /api/series/[id] — 시리즈 수정 (admin only)
// { position } → 사용자 정의 순서에서 그 자리(1부터)로 옮기고 전체 순번을 1부터 다시 매긴다
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  let body = await request.json();

  // 제목(ko/en) 길이 검증 — partial update 라 존재할 때만. UI/폼 우회 방어.
  if (typeof body.title === "string" && body.title.length > SERIES_TITLE_MAX)
    return jsonError(`title must be ${SERIES_TITLE_MAX} characters or fewer`, 400, { code: "SERIES_TITLE_TOO_LONG", params: { max: SERIES_TITLE_MAX } });
  if (typeof body.title_en === "string" && body.title_en.length > SERIES_TITLE_MAX)
    return jsonError(`title_en must be ${SERIES_TITLE_MAX} characters or fewer`, 400, { code: "SERIES_TITLE_TOO_LONG", params: { max: SERIES_TITLE_MAX } });

  // 시리즈는 자기 카테고리를 갖지 않음(멤버 글에서 도출) — category 쓰기 경로 제거.

  /* 순서는 position 으로만 바꾼다 — sort_order 를 직접 쓰면 0 · 빈 번호 · 중복이 생겨 화면 번호가 어긋났다 */
  const { position, sort_order: _sortOrder, ...fields } = body as Record<string, unknown> & { position?: unknown };
  if (typeof position === "number" && Number.isFinite(position)) {
    try {
      await moveSeriesTo(supabase, id, position);
    } catch (e) {
      return jsonServerError(e, "PATCH /api/series/[id] position");
    }
  }
  if (Object.keys(fields).length === 0) {
    const { data, error } = await supabase.from("series").select().eq("id", id).single();
    if (error) return jsonServerError(error, "PATCH /api/series/[id]");
    return jsonOk(data);
  }
  body = fields;

  /* 자동 커버를 쓰는 시리즈의 제목이 바뀌면 커버도 새 제목으로 다시 그린다(올린 커버는 그대로) */
  let oldAutoCover: string | null = null;
  if ((typeof body.title === "string" || typeof body.title_en === "string") && body.cover_image === undefined) {
    const { data: cur } = await supabase.from("series").select("title, title_en, cover_image").eq("id", id).maybeSingle();
    const titleChanged = cur && ((typeof body.title === "string" && body.title !== cur.title) || (typeof body.title_en === "string" && body.title_en !== cur.title_en));
    if (cur && titleChanged && isAutoSeriesCover(cur.cover_image)) {
      try {
        body.cover_image = await createSeriesCover({ id, title: body.title ?? cur.title, title_en: body.title_en ?? cur.title_en });
        oldAutoCover = cur.cover_image;
      } catch (e) {
        console.warn("[PATCH /api/series/[id]] auto cover failed:", e instanceof Error ? e.message : e);
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
  if (oldAutoCover) await removeAutoSeriesCover(oldAutoCover);

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
    /* 하위 포스트도 휴지통으로 — 글 하나 지우기(DELETE /api/posts/[id])와 같게 비공개로 내리고 30일 뒤 영구 삭제.
       published 를 그대로 두면 휴지통 글이 공개 목록 · anon 읽기로 계속 보였다 */
    const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString(), purge_after: purgeAfter, published: false, series_id: null, series_order: 0 })
      .eq("series_id", id);
  } else {
    // 소속 포스트의 series_id를 null로 초기화
    await supabase.from("posts").update({ series_id: null, series_order: 0 }).eq("series_id", id);
  }

  const { error } = await supabase.from("series").delete().eq("id", id);

  if (error) return jsonServerError(error, "DELETE /api/series/[id]");

  return jsonOk({ success: true });
}
