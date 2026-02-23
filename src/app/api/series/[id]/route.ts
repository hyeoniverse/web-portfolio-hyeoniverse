import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/series/[id] — 단일 시리즈 + 소속 포스트 목록
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: series, error } = await admin
    .from("series")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !series) {
    return NextResponse.json({ error: "Series not found" }, { status: 404 });
  }

  const { data: posts } = await admin
    .from("posts")
    .select("id, title, slug, excerpt, published, series_order, created_at, title_en, cover_image")
    .eq("series_id", id)
    .order("series_order", { ascending: true });

  return NextResponse.json({ ...series, posts: posts ?? [] });
}

// PATCH /api/series/[id] — 시리즈 수정 (admin only)
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("series")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/series/[id] — 시리즈 삭제 (admin only)
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 소속 포스트의 series_id를 null로 초기화
  await admin.from("posts").update({ series_id: null, series_order: 0 }).eq("series_id", id);

  const { error } = await admin.from("series").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
