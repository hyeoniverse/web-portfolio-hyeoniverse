import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPostCategory } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";
import type { PostFormData } from "@/types/post";

// GET /api/posts — 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "12");
  const tag = searchParams.get("tag");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const searchType = searchParams.get("searchType") ?? "title"; // title | all
  const slug = searchParams.get("slug");
  const showAll = searchParams.get("all") === "true"; // admin용
  const showTrash = searchParams.get("trash") === "true"; // 휴지통

  const supabase = showAll || showTrash ? createAdminClient() : await createClient();

  const sort = searchParams.get("sort") ?? "newest";

  let query = supabase
    .from("posts")
    .select("*, series:series_id(title, title_en)", { count: "exact" });

  if (showTrash) {
    // 휴지통: deleted_at IS NOT NULL
    query = query.not("deleted_at", "is", null);
  } else if (!showAll) {
    // 공개: published=true + deleted_at IS NULL
    query = query.eq("published", true).is("deleted_at", null);
  } else {
    // 어드민 전체: deleted_at IS NULL (삭제 안된 것만)
    query = query.is("deleted_at", null);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (slug) {
    query = query.eq("slug", slug);
  }

  // pinned 필터: "true" → pinned만, "false" → pinned 제외, 미지정 → 전체
  const pinned = searchParams.get("pinned");
  if (pinned === "true") {
    query = query.eq("is_pinned", true);
  } else if (pinned === "false") {
    query = query.eq("is_pinned", false);
  }

  // series 필터
  const seriesId = searchParams.get("series_id");
  if (seriesId) {
    query = query.eq("series_id", seriesId);
  }

  if (search) {
    if (searchType === "all") {
      query = query.or(`title.ilike.%${search}%,title_en.ilike.%${search}%,content.ilike.%${search}%,content_en.ilike.%${search}%`);
    } else if (searchType === "content") {
      query = query.or(`content.ilike.%${search}%,content_en.ilike.%${search}%`);
    } else {
      query = query.or(`title.ilike.%${search}%,title_en.ilike.%${search}%`);
    }
  }

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort !== "popular") {
    query = query.order("created_at", { ascending: false });
  }

  // popular: 복합 점수 (views + likes*3 + comments*5) → JS 정렬
  if (sort === "popular") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectWithComments = (query as any).select("*, series:series_id(title, title_en), comments(count)", { count: "exact" });
    const { data: rawData, count: totalCount, error: popError } = await selectWithComments;

    if (popError) {
      return NextResponse.json({ error: popError.message }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scored = ((rawData ?? []) as any[]).map((p: any) => {
      const commentCount = Array.isArray(p.comments) ? (p.comments[0]?.count ?? 0) : 0;
      return { ...p, _score: p.view_count + p.like_count * 3 + commentCount * 5, comments: undefined };
    });
    scored.sort((a, b) => b._score - a._score);

    const from = (page - 1) * limit;
    const paged = scored.slice(from, from + limit).map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      posts: paged,
      total: totalCount ?? 0,
      page,
      totalPages: Math.ceil((totalCount ?? 0) / limit),
    });
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    posts: data,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

// POST /api/posts — 새 포스트 생성 (admin only)
export async function POST(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body: PostFormData = await request.json();

  // slug 자동 생성
  if (!body.slug) {
    body.slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Validate category
  if (body.category && !(await isValidPostCategory(body.category))) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("posts").insert(body).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
