import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonServerError } from "@/lib/api/response";

// GET /api/calendars — 공유 달력 목록 (admin). ?trash=true 면 휴지통(삭제된 것)만.
export async function GET(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  const showTrash = new URL(request.url).searchParams.get("trash") === "true";
  try {
    const admin = createAdminClient();
    let query = admin
      .from("calendars")
      .select("id, title, data, updated_at, deleted_at, purge_after")
      .order("updated_at", { ascending: false });
    // 평상시엔 삭제된 것 제외, 휴지통 뷰면 삭제된 것만
    query = showTrash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throw error;
    const items = (data ?? []).map((row) => ({
      id: row.id as string,
      title: (row.title as string) || "",
      month: ((row.data as { month?: string })?.month) || "",
      eventCount: Array.isArray((row.data as { events?: unknown[] })?.events) ? (row.data as { events: unknown[] }).events.length : 0,
      updatedAt: row.updated_at as string,
      deletedAt: (row.deleted_at as string | null) ?? null,
      purgeAfter: (row.purge_after as string | null) ?? null,
    }));
    return NextResponse.json({ items });
  } catch (e) {
    return jsonServerError(e);
  }
}

// POST /api/calendars — 새 공유 달력 생성 (admin). body: { title?, data? } → { id }
export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  let body: { title?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid body");
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("calendars")
      .insert({
        title: typeof body.title === "string" ? body.title : "",
        data: body.data && typeof body.data === "object" ? body.data : {},
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    return jsonServerError(e);
  }
}
