import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { ensurePostCategory } from "@/lib/api/validateCategory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/series/[id] — 단일 시리즈 + 소속 포스트 목록
// 비공개 시리즈는 로그인된 사용자만 조회 가능 (info leak 방지)
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: series, error } = await admin
    .from("series")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !series) return jsonError("Series not found", 404);

  // 비공개면 auth 필요
  if (!series.published) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Series not found", 404);
  }

  const { data: posts } = await admin
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
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const url = new URL(request.url);
  const skipShift = url.searchParams.get("skipShift") === "true";

  // 카테고리 직접 입력 시 자동 등록 (기존 목록에 없으면)
  if (body.category) {
    await ensurePostCategory(body.category as string);
  }

  const admin = createAdminClient();

  // sort_order 변경 시 — 다른 시리즈들과 충돌 방지로 shift (skipShift 모드 제외)
  if (!skipShift && body.sort_order !== undefined && body.sort_order !== null) {
    const { data: cur } = await admin
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
      const { data: affected } = await admin
        .from("series")
        .select("id, sort_order")
        .neq("id", id)
        .gte("sort_order", lo)
        .lte("sort_order", hi);
      if (affected) {
        // 각 행의 새 sort_order 가 row 별로 다르므로 PostgREST 단일 UPDATE 불가 — 병렬 호출로 round-trip 단축
        await Promise.all(
          affected.map((row) =>
            admin
              .from("series")
              .update({ sort_order: row.sort_order + direction })
              .eq("id", row.id),
          ),
        );
      }
    }
  }

  const { data, error } = await admin
    .from("series")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonServerError(error);

  return jsonOk(data);
}

// DELETE /api/series/[id]?deletePosts=true — 시리즈 삭제 (admin only)
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const deletePosts = searchParams.get("deletePosts") === "true";

  if (deletePosts) {
    // 하위 포스트도 soft delete
    await admin.from("posts").update({ deleted_at: new Date().toISOString(), series_id: null, series_order: 0 }).eq("series_id", id);
  } else {
    // 소속 포스트의 series_id를 null로 초기화
    await admin.from("posts").update({ series_id: null, series_order: 0 }).eq("series_id", id);
  }

  const { error } = await admin.from("series").delete().eq("id", id);

  if (error) return jsonServerError(error);

  return jsonOk({ success: true });
}
