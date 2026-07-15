import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonServerError } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ calendarId: string }>;
}

// GET /api/calendars/[calendarId] — 달력 데이터 로드 (공개, 리더/에디터 공용)
export async function GET(_request: Request, context: RouteContext) {
  const { calendarId } = await context.params;
  if (!calendarId) return jsonError("Invalid calendar id");
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("calendars")
      .select("id, title, data, deleted_at")
      .eq("id", calendarId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return jsonError("Calendar not found", 404);
    // 휴지통(soft delete) 상태면 블록이 "연결 끊김"으로 표시하도록 deleted 플래그 반환
    if (data.deleted_at) return NextResponse.json({ id: data.id, deleted: true });
    return NextResponse.json({ id: data.id, title: data.title ?? "", data: data.data ?? {} });
  } catch (e) {
    return jsonServerError(e);
  }
}

// PUT /api/calendars/[calendarId] — 달력 저장 (admin). body: { data?, title? }
export async function PUT(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const { calendarId } = await context.params;
  if (!calendarId) return jsonError("Invalid calendar id");
  let body: { data?: unknown; title?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid body");
  }
  try {
    const admin = createAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.data && typeof body.data === "object") patch.data = body.data;
    if (typeof body.title === "string") patch.title = body.title;
    const { error } = await admin.from("calendars").update(patch).eq("id", calendarId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonServerError(e);
  }
}

// DELETE /api/calendars/[calendarId] — 휴지통 이동 (soft delete, admin).
// deleted_at + purge_after(30일) 세팅. 참조 블록은 GET 의 deleted 플래그로 "연결 끊김" 표시.
// 복구는 /restore, 영구삭제는 /purge, 30일 후 cron 이 hard delete.
export async function DELETE(_request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const { calendarId } = await context.params;
  if (!calendarId) return jsonError("Invalid calendar id");
  try {
    const admin = createAdminClient();
    const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await admin
      .from("calendars")
      .update({ deleted_at: new Date().toISOString(), purge_after: purgeAfter })
      .eq("id", calendarId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonServerError(e);
  }
}
