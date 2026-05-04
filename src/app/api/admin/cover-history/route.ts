import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX = 24;

// GET /api/admin/cover-history — 현재 admin user 의 이력 (최신순, 최대 MAX)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ history: [] });

  try {
    const { data, error } = await supabase
      .from("cover_image_history")
      .select("id, url, source, meta, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX);

    if (error) {
      console.warn("[cover-history GET]", error.message);
      return NextResponse.json({ history: [] });
    }
    return NextResponse.json({ history: data ?? [] });
  } catch (e) {
    console.warn("[cover-history GET] unexpected:", e);
    return NextResponse.json({ history: [] });
  }
}

// POST /api/admin/cover-history — 이력 추가 (UPSERT — 동일 url 이면 created_at 갱신)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const url = String(body?.url ?? "").trim();
    const source = String(body?.source ?? "");
    const meta = String(body?.meta ?? "");
    if (!url || !["ai", "unsplash", "preset"].includes(source)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from("cover_image_history")
      .upsert(
        { user_id: user.id, url, source, meta, created_at: new Date().toISOString() },
        { onConflict: "user_id,url" },
      );

    if (error) {
      console.warn("[cover-history POST]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/cover-history?url=... — 단일 항목 제거
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const { error } = await supabase
      .from("cover_image_history")
      .delete()
      .eq("user_id", user.id)
      .eq("url", url);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
