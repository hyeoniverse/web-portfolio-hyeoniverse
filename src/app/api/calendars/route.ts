import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { buildCalendarUsage } from "@/lib/calendarUsage";

/* 달력 블록이 들어갈 수 있는 프로젝트 본문 칸 — 프로젝트 편집기에서 리치 텍스트로 쓰는 칸들 */
const WORK_HTML_COLS = ["content_ko", "content_en", "overview_ko", "overview_en", "challenge_ko", "challenge_en", "solution_ko", "solution_en", "description_ko", "description_en"] as const;
const MARK = "%data-calendar-id=%";

// GET /api/calendars — 공유 달력 목록 (admin). ?trash=true 면 휴지통(삭제된 것)만.
export async function GET(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;
  const showTrash = new URL(request.url).searchParams.get("trash") === "true";
  try {
    let query = supabase
      .from("calendars")
      .select("id, title, data, updated_at, deleted_at, purge_after")
      .order("updated_at", { ascending: false });
    // 평상시엔 삭제된 것 제외, 휴지통 뷰면 삭제된 것만
    query = showTrash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throw error;
    /* 사용처 — 달력 표시가 든 본문만 골라 와서(휴지통 글 제외) 달력별로 센다. 휴지통 목록엔 붙이지 않는다 */
    let usage: ReturnType<typeof buildCalendarUsage> = new Map();
    if (!showTrash) {
      const [posts, works] = await Promise.all([
        supabase.from("posts").select("id, title, slug, content, content_en").is("deleted_at", null)
          .or(`content.ilike.${MARK},content_en.ilike.${MARK}`),
        supabase.from("works").select(`id, title, slug, ${WORK_HTML_COLS.join(", ")}`).is("deleted_at", null)
          .or(WORK_HTML_COLS.map((c) => `${c}.ilike.${MARK}`).join(",")),
      ]);
      if (posts.error) throw posts.error;
      if (works.error) throw works.error;
      type Row = Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      usage = buildCalendarUsage(
        ((posts.data ?? []) as Row[]).map((r) => ({ id: str(r.id), title: str(r.title), slug: str(r.slug), html: [str(r.content), str(r.content_en)] })),
        ((works.data ?? []) as unknown as Row[]).map((r) => ({ id: str(r.id), title: str(r.title), slug: str(r.slug), html: WORK_HTML_COLS.map((c) => str(r[c])) })),
      );
    }
    const items = (data ?? []).map((row) => ({
      id: row.id as string,
      title: (row.title as string) || "",
      month: ((row.data as { month?: string })?.month) || "",
      eventCount: Array.isArray((row.data as { events?: unknown[] })?.events) ? (row.data as { events: unknown[] }).events.length : 0,
      updatedAt: row.updated_at as string,
      deletedAt: (row.deleted_at as string | null) ?? null,
      purgeAfter: (row.purge_after as string | null) ?? null,
      ...(showTrash ? {} : { usage: usage.get(row.id as string) ?? { posts: [], works: [] } }),
    }));
    return NextResponse.json({ items });
  } catch (e) {
    return jsonServerError(e, "GET /api/calendars");
  }
}

// POST /api/calendars — 새 공유 달력 생성 (admin). body: { title?, data? } → { id }
export async function POST(request: Request) {
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;
  let body: { title?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid body");
  }
  try {
    const { data, error } = await supabase
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
    return jsonServerError(e, "POST /api/calendars");
  }
}
