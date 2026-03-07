import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWorksCategory } from "@/lib/api/validateCategory";
// GET /api/works — 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true"; // admin용
  const page = parseInt(searchParams.get("page") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "0");

  const supabase = createAdminClient();

  let query = supabase.from("works").select("*", { count: "exact" });

  if (!showAll) {
    query = query.eq("published", true);
  }

  query = query.order("sort_order", { ascending: true });

  // 페이지네이션 (page/limit 둘 다 있을 때만 적용)
  if (page > 0 && limit > 0) {
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  return NextResponse.json({
    works: data,
    total,
    page: page || 1,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
  });
}

// POST /api/works — 새 work 생성 (admin only)
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

export async function POST(request: Request) {
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

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("works")
    .insert(filtered)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
