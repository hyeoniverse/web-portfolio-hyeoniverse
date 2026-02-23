import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ADJACENT_FIELDS = "id, title, slug, cover_image, title_en, excerpt, excerpt_en, created_at";

// GET /api/posts/[id]/adjacent — 이전/다음 게시물
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  // 현재 포스트의 created_at 조회
  const { data: current, error: currentError } = await admin
    .from("posts")
    .select("created_at")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ prev: null, next: null });
  }

  // 이전 포스트 (더 오래된)
  const { data: prev } = await admin
    .from("posts")
    .select(ADJACENT_FIELDS)
    .eq("published", true)
    .lt("created_at", current.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 다음 포스트 (더 새로운)
  const { data: next } = await admin
    .from("posts")
    .select(ADJACENT_FIELDS)
    .eq("published", true)
    .gt("created_at", current.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return NextResponse.json({ prev: prev ?? null, next: next ?? null });
}
