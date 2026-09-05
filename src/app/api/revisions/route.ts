import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { QUERY_PARAM } from "@/constants";
import { requireAuth } from "@/lib/api/requireAuth";

const MAX_REVISIONS = 50;

// GET /api/revisions?entity_type=post&entity_id=xxx&limit=50
export async function GET(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entity_type");
  const entityId = searchParams.get("entity_id");
  const limit = parseInt(searchParams.get(QUERY_PARAM.limit) ?? "50");
  // 편집기 진입 시 — list + 가장 최근 non-dismissed snapshot 을 한 번에 받아 modal 까지 round-trip 절반으로
  const withLatestSnapshot = searchParams.get("with_latest_snapshot") === "1";

  if (!entityType || !entityId) {
    return jsonError("entity_type and entity_id required", 400);
  }

  if (withLatestSnapshot) {
    const [listResult, latestResult] = await Promise.all([
      supabase
        .from("revisions")
        .select("id, entity_type, entity_id, title, dismissed, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("revisions")
        .select("id, snapshot, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (listResult.error) {
      return jsonServerError(listResult.error, "GET /api/revisions");
    }
    return NextResponse.json({
      revisions: listResult.data,
      latestUndismissed: latestResult.data ?? null,
    });
  }

  const { data, error } = await supabase
    .from("revisions")
    .select("id, entity_type, entity_id, title, dismissed, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return jsonServerError(error, "GET /api/revisions");
  }

  return NextResponse.json(data);
}

// POST /api/revisions — 리비전 저장 + 오래된 항목 정리
export async function POST(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { entity_type, entity_id, snapshot, title } = body;

  if (!entity_type || !entity_id || !snapshot) {
    return jsonError("entity_type, entity_id, snapshot required", 400);
  }

  // 직전 리비전과 snapshot이 같으면 새로 생성하지 않음 (첫 저장이면 0 rows 이므로 maybeSingle)
  const { data: latest } = await supabase
    .from("revisions")
    .select("id, snapshot, created_at")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    const sortedStringify = (obj: unknown) => JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
    if (sortedStringify(latest.snapshot) === sortedStringify(snapshot)) {
      return NextResponse.json({ id: latest.id, created_at: latest.created_at, skipped: true });
    }
  }

  const { data, error } = await supabase
    .from("revisions")
    .insert({ entity_type, entity_id, snapshot, title: title || "" })
    .select("id, created_at")
    .single();

  if (error) {
    return jsonServerError(error, "POST /api/revisions");
  }

  // 엔티티당 MAX_REVISIONS 초과분 정리
  const { data: overflow } = await supabase
    .from("revisions")
    .select("id")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false })
    .range(MAX_REVISIONS, MAX_REVISIONS + 1000);

  if (overflow && overflow.length > 0) {
    await supabase
      .from("revisions")
      .delete()
      .in(
        "id",
        overflow.map((r) => r.id),
      );
  }

  return NextResponse.json(data);
}

// PATCH /api/revisions — 엔티티의 모든 리비전 bulk dismissed 처리
//   body: { entity_type, entity_id, dismissed: true }
//   주 use case: 실제 save (publish / draft 저장) 후 모든 autosave revision 을 dismiss
//   → 다음 편집 진입 시 "draft 복원" 모달 안 뜸 (DB 가 진실의 원천)
export async function PATCH(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { entity_type, entity_id, dismissed } = body;

  if (!entity_type || !entity_id) {
    return jsonError("entity_type and entity_id required", 400);
  }
  const { error } = await supabase
    .from("revisions")
    .update({ dismissed: !!dismissed })
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id);

  if (error) {
    return jsonServerError(error, "PATCH /api/revisions");
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/revisions?entity_type=post&entity_id=xxx — 엔티티의 전체 리비전 삭제
export async function DELETE(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entity_type");
  const entityId = searchParams.get("entity_id");

  if (!entityType || !entityId) {
    return jsonError("entity_type and entity_id required", 400);
  }
  const { error } = await supabase
    .from("revisions")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    return jsonServerError(error, "DELETE /api/revisions");
  }

  return NextResponse.json({ ok: true });
}
