import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWorksCategory } from "@/lib/api/validateCategory";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/works/[id] — 단일 work
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("works")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/works/[id] — work 수정 (admin only)
const ALLOWED_FIELDS = new Set([
  "number", "title",
  "subtitle_ko", "subtitle_en",
  "category_ko", "category_en",
  "year",
  "description_ko", "description_en",
  "role_ko", "role_en",
  "tech", "image", "size",
  "content_ko", "content_en", "content_type",
  "overview_ko", "overview_en", "overview_image",
  "challenge_ko", "challenge_en", "challenge_image",
  "solution_ko", "solution_en", "solution_image",
  "team_members", "gallery",
  "live_url", "github_url",
  "published", "sort_order",
]);

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
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) filtered[key] = body[key];
  }
  if (filtered.category_ko && filtered.category_en &&
      !(await isValidWorksCategory(filtered.category_ko as string, filtered.category_en as string))) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  filtered.updated_at = new Date().toISOString();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("works")
    .update(filtered)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/works/[id] — work 삭제 (admin only)
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
  const { error } = await admin.from("works").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
