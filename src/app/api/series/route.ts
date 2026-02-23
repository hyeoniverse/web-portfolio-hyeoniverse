import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/series — 시리즈 목록
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true";

  const admin = createAdminClient();

  const category = searchParams.get("category");

  let query = admin.from("series").select("*").order("created_at", { ascending: false });

  if (!showAll) {
    query = query.eq("published", true);
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data: seriesList, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 각 시리즈의 포스트 수 집계
  const ids = (seriesList ?? []).map((s) => s.id);
  let postCounts: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: counts } = await admin
      .from("posts")
      .select("series_id")
      .in("series_id", ids)
      .eq("published", !showAll ? true : true);

    if (counts) {
      postCounts = counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.series_id] = (acc[row.series_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  const result = (seriesList ?? []).map((s) => ({
    ...s,
    post_count: postCounts[s.id] || 0,
  }));

  return NextResponse.json(result);
}

// POST /api/series — 시리즈 생성 (admin only)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // slug 자동 생성
  if (!body.slug) {
    body.slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("series").insert(body).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
