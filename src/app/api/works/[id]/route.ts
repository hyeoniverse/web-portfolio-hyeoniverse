import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureWorksCategory } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/works/[id] — 단일 work
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("works")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/works/[id] — work 수정 (admin only)
const ALLOWED_FIELDS = new Set([
  "number", "title",
  "subtitle_ko", "subtitle_en",
  "category_ko", "category_en",
  "year",
  "description_ko", "description_en",
  "role_ko", "role_en",
  "tech", "image", "size",
  "content_ko", "content_en", "content_type",
  "overview_ko", "overview_en", "overview_image",
  "challenge_ko", "challenge_en", "challenge_image",
  "solution_ko", "solution_en", "solution_image",
  "team_members", "gallery",
  "live_url", "github_url",
  "published", "sort_order",
  "scheduled_at",
]);

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  // ?skipShift=true 면 sort_order auto-shift 건너뜀 (drag 의 batch 호출이 자체 정렬을 관리하므로)
  const url = new URL(request.url);
  const skipShift = url.searchParams.get("skipShift") === "true";

  const body = await request.json();
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) filtered[key] = body[key];
  }
  // 카테고리 직접 입력 시 자동 등록 (기존 목록에 없으면)
  if (filtered.category_ko || filtered.category_en) {
    await ensureWorksCategory(
      (filtered.category_ko as string) ?? "",
      (filtered.category_en as string) ?? "",
    );
  }

  filtered.updated_at = new Date().toISOString();

  const admin = createAdminClient();

  // sort_order 변경 시 — 다른 work 들 충돌 방지를 위해 shift (skipShift 모드 제외)
  // 1) 기존 sort_order 조회 → 새 값과 다를 때만 동작
  // 2) 새 값으로 이동 시: [old, new] 사이의 다른 항목들을 1 만큼 shift (방향에 따라)
  if (!skipShift && filtered.sort_order !== undefined) {
    const { data: cur } = await admin
      .from("works")
      .select("sort_order")
      .eq("id", id)
      .maybeSingle();
    const oldOrder = cur?.sort_order;
    const newOrder = filtered.sort_order as number;

    if (typeof oldOrder === "number" && oldOrder !== newOrder) {
      // 가져올 다른 work 의 범위 계산
      const lo = Math.min(oldOrder, newOrder);
      const hi = Math.max(oldOrder, newOrder);
      const movingDown = newOrder > oldOrder; // 큰 값으로 이동 → 사이 항목들 -1
      const movingUp = newOrder < oldOrder; // 작은 값으로 이동 → 사이 항목들 +1

      const { data: affected } = await admin
        .from("works")
        .select("id, sort_order")
        .neq("id", id)
        .gte("sort_order", lo)
        .lte("sort_order", hi)
        .is("deleted_at", null);

      if (affected && affected.length > 0) {
        await Promise.all(
          affected.map((w) =>
            admin
              .from("works")
              .update({ sort_order: movingDown ? w.sort_order - 1 : w.sort_order + 1 })
              .eq("id", w.id),
          ),
        );
      }
      // movingUp/movingDown 둘 다 처리됨; 변수는 가독성용
      void movingUp;
    }
  }

  const { data, error } = await admin
    .from("works")
    .update(filtered)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/works/[id] — 휴지통으로 이동 (소프트 삭제, admin only)
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { error } = await admin
    .from("works")
    .update({ deleted_at: new Date().toISOString(), published: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
