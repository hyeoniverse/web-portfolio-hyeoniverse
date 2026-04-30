import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePostCategory } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/posts/[id] — 단일 포스트
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/posts/[id] — 포스트 수정 (admin only)
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();

  // 카테고리 직접 입력 시 자동 등록 (기존 목록에 없으면)
  if (body.category) {
    await ensurePostCategory(body.category as string);
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("posts")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/posts/[id] — 휴지통으로 이동 (소프트 삭제, admin only)
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { error } = await admin
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), published: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
