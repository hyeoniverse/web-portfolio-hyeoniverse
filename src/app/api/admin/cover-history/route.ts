import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";

const MAX = 24;

// GET /api/admin/cover-history — 현재 admin user 의 이력 (최신순, 최대 MAX)
// 인증 없을 때도 200 + 빈 리스트 (graceful degradation — UI 가 잠시 비로그인 상태일 때 콘솔 노이즈 차단)
export async function GET() {
  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return jsonOk({ history: [] });

  try {
    const { data, error } = await supabase
      .from("cover_image_history")
      .select("id, url, source, meta, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX);

    if (error) {
      console.warn("[cover-history GET]", error.message);
      return jsonOk({ history: [] });
    }
    return jsonOk({ history: data ?? [] });
  } catch (e) {
    console.warn("[cover-history GET] unexpected:", e);
    return jsonOk({ history: [] });
  }
}

// POST /api/admin/cover-history — 이력 추가 (UPSERT — 동일 url 이면 created_at 갱신)
export async function POST(request: Request) {
  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const url = String(body?.url ?? "").trim();
    const source = String(body?.source ?? "");
    const meta = String(body?.meta ?? "");
    if (!url || !["ai", "unsplash", "preset"].includes(source)) {
      return jsonError("Invalid payload", 400);
    }

    const { error } = await supabase
      .from("cover_image_history")
      .upsert(
        { user_id: user.id, url, source, meta, created_at: new Date().toISOString() },
        { onConflict: "user_id,url" },
      );

    if (error) {
      console.warn("[cover-history POST]", error.message);
      return jsonServerError(error, "POST /api/admin/cover-history");
    }

    // MAX 초과분 정리 — 오래된 것부터 삭제
    const { data: rows } = await supabase
      .from("cover_image_history")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (rows && rows.length > MAX) {
      const overflowIds = rows.slice(MAX).map((r) => r.id);
      await supabase.from("cover_image_history").delete().in("id", overflowIds);
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return jsonServerError(e, "POST /api/admin/cover-history");
  }
}

// DELETE /api/admin/cover-history?url=... — 단일 항목 제거
export async function DELETE(request: Request) {
  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) return jsonError("url required", 400);

    const { error } = await supabase
      .from("cover_image_history")
      .delete()
      .eq("user_id", user.id)
      .eq("url", url);

    if (error) return jsonServerError(error, "DELETE /api/admin/cover-history");
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonServerError(e, "DELETE /api/admin/cover-history");
  }
}
