import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { ensureWorksCategory } from "@/lib/api/validateCategory";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";
import { PERM } from "@/lib/api/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { placeWork } from "@/lib/api/placeWork";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/works/[id] — 단일 work (admin 전용 — 비공개/휴지통 포함 raw 조회).
// 공개 페이지는 getWorks() 로 정적 데이터에서 조회. id 기반 직접 접근은 admin editor 에서만 사용.
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  /* 작업물은 admin 이상만 다룬다(소유권 개념 없음). 인증만 있던 동안에는
     레벨 1 저자도 미발행 작업물을 그대로 볼 수 있었다. */
  const { supabase: admin, error: authError } = await requirePostAccess("works", id);
  if (authError) return authError;

  const { data, error } = await admin
    .from("works")
    .select("*")
    .eq("id", id)
    .single();

  /* requirePostAccess 가 존재와 권한을 이미 확인했다 — 여기서 0행이면 정책이 막은 것이다. */
  if (error || !data) return policyBlocked();

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
  const { supabase: admin, role, error: authError } = await requirePostAccess("works", id);
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

  /* 팀원 목록의 "연결된 계정"(author_id)은 곧 이 작업물의 편집 권한이다 — canEditWork 와
     RLS 의 can_edit_work 가 이 값을 본다. 팀원 자격으로 편집하는 사람이 그 명단을 바꿀 수
     있으면 스스로 권한을 넓힐 수 있으므로, 연결의 변경은 관리자만 할 수 있다.
     이름·역할·작업 내용 같은 나머지 항목은 팀원도 그대로 고칠 수 있다. */
  if (filtered.team_members !== undefined && !(role.isOwner || role.level >= PERM.ADMIN)) {
    const linkedIds = (v: unknown) =>
      new Set(
        (Array.isArray(v) ? v : [])
          .map((m) => (m as { author_id?: unknown })?.author_id)
          .filter((x): x is string => typeof x === "string" && !!x),
      );
    /* 현재 값은 service_role 로 읽는다 — 정책이 행을 거르면 "안 바뀌었다" 로 오판한다. */
    const { data: current } = await createAdminClient()
      .from("works").select("team_members").eq("id", id).maybeSingle();
    const before = linkedIds(current?.team_members);
    const after = linkedIds(filtered.team_members);
    const same = before.size === after.size && [...after].every((x) => before.has(x));
    if (!same) {
      return NextResponse.json(
        {
          error: "Forbidden",
          reason: "팀원에 연결된 계정을 바꾸려면 관리자 등급이 필요합니다. 소유자에게 요청해 주세요.",
          code: "WORK_TEAM_LINK_ADMIN_ONLY",
        },
        { status: 403 },
      );
    }
  }

  filtered.updated_at = new Date().toISOString();


  // sort_order 변경 시 — 그 자리에 끼우고 전체를 1..N 으로 다시 매긴다(skipShift=true 인 목록 끌어 놓기 묶음 제외).
  // 기존 0/duplicate 도 자동 정리. 한 요청 안에서 끝내야 한다 — placeWork 주석(#873)
  if (!skipShift && filtered.sort_order !== undefined) {
    // sort_order 만 빼고 나머지 필드는 대상 작업물에 함께 쓴다
    const targetOtherFields = { ...filtered };
    delete targetOtherFields.sort_order;
    if (await placeWork(admin, id, filtered.sort_order as number, targetOtherFields)) {
      // 이미 target update 완료 → 아래 simple update 단계는 skip
      const { data, error } = await admin
        .from("works").select("*").eq("id", id).single();
      if (error) return jsonServerError(error, "PATCH /api/works/[id]");
      return NextResponse.json(data);
    }
  }

  const { data, error } = await admin
    .from("works")
    // updated_at 명시 갱신 — 자동저장 복원이 "마지막 저장보다 새 draft 만" 되돌리게(clock-safe).
    .update({ ...filtered, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return jsonServerError(error, "PATCH /api/works/[id]");
  }

  return NextResponse.json(data);
}

// DELETE /api/works/[id] — 휴지통으로 이동 (소프트 삭제, admin only)
// works 는 view/like 카운터 없음 → 일률 30일 후 자동 영구삭제
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase: admin, error: authError } = await requirePostAccess("works", id);
  if (authError) return authError;

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
    return jsonServerError(error, "DELETE /api/works/[id]");
  }

  return NextResponse.json({ success: true });
}
