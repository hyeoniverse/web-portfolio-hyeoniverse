import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureWorksCategory } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/works/[id] — 단일 work (admin 전용 — 비공개/휴지통 포함 raw 조회).
// 공개 페이지는 getWorks() 로 정적 데이터에서 조회. id 기반 직접 접근은 admin editor 에서만 사용.
export async function GET(_request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

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
  "slug", "title",
  "subtitle_ko", "subtitle_en",
  "categories_ko", "categories_en",
  "nature_ko", "nature_en",
  "year",
  "description_ko", "description_en",
  "role_ko", "role_en",
  "contributions_ko", "contributions_en",
  "tech", "tech_notes", "image", "icon",
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
  // 카테고리 직접 입력 시 자동 등록 — array 안의 각 항목을 ensure
  const newCatsKo = Array.isArray(filtered.categories_ko) ? filtered.categories_ko as string[] : [];
  const newCatsEn = Array.isArray(filtered.categories_en) ? filtered.categories_en as string[] : [];
  for (let i = 0; i < newCatsKo.length; i++) {
    const ko = newCatsKo[i] || "";
    const en = newCatsEn[i] || "";
    if (ko || en) await ensureWorksCategory(ko, en);
  }

  filtered.updated_at = new Date().toISOString();

  const admin = createAdminClient();

  // sort_order 변경 시 — 전체 dense 1..N normalize (skipShift=true 인 batch 모드 제외)
  // 기존 0/duplicate 도 자동 정리. 단일 PATCH 마다 호출돼도 OK (N=수십개 수준).
  if (!skipShift && filtered.sort_order !== undefined) {
    const newOrder = filtered.sort_order as number;
    // sort_order 만 빼고 나머지 필드는 그대로 (normalize 단계에서 target 만 추가 필드 포함)
    const targetOtherFields = { ...filtered };
    delete targetOtherFields.sort_order;

    const { data: all } = await admin
      .from("works")
      .select("id, sort_order, created_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (all && all.length > 0) {
      // target 을 desired position 에 삽입한 새 ordering
      const without = all.filter((w) => w.id !== id);
      const desiredIdx = Math.max(0, Math.min(newOrder - 1, without.length));
      const reordered = [
        ...without.slice(0, desiredIdx),
        { id, sort_order: 0, created_at: "" },
        ...without.slice(desiredIdx),
      ];

      // 변경 필요한 항목만 update — sort_order 가 expected (idx+1) 와 다른 row + target
      const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];
      reordered.forEach((w, idx) => {
        const expected = idx + 1;
        if (w.id === id) {
          updates.push({ id: w.id, payload: { ...targetOtherFields, sort_order: expected } });
        } else {
          const orig = all.find((x) => x.id === w.id);
          if (orig?.sort_order !== expected) {
            updates.push({ id: w.id, payload: { sort_order: expected } });
          }
        }
      });

      await Promise.all(
        updates.map((u) =>
          admin.from("works").update(u.payload).eq("id", u.id),
        ),
      );

      // 이미 target update 완료 → 아래 simple update 단계는 skip
      const { data, error } = await admin
        .from("works").select("*").eq("id", id).single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
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
// works 는 view/like 카운터 없음 → 일률 30일 후 자동 영구삭제
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("works")
    .update({
      deleted_at: new Date().toISOString(),
      purge_after: purgeAfter,
      published: false,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
