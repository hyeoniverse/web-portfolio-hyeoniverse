import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePostCategory } from "@/lib/api/validateCategory";

// GET /api/series — 시리즈 목록
// 쿼리: ?all=true (비공개 포함), ?category=, ?q= (검색),
//       ?page=&limit= (서버 페이지네이션 — 지정 시 { items, total } 반환),
//       ?findPage=<id>&limit= (해당 시리즈가 속한 페이지 번호 반환)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true";

  const admin = createAdminClient();

  const category = searchParams.get("category");
  const q = (searchParams.get("q") || "").trim();
  const searchType = (searchParams.get("searchType") || "all") as "all" | "title";
  const findPageId = searchParams.get("findPage");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const isPaginated = pageParam !== null;
  const page = Math.max(0, parseInt(pageParam || "0", 10) || 0);
  const limit = Math.max(1, Math.min(100, parseInt(limitParam || "5", 10) || 5));

  // findPage 모드 — sort_order 기준
  if (findPageId) {
    const { data: ids } = await admin
      .from("series")
      .select("id")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    const idx = (ids ?? []).findIndex((r) => r.id === findPageId);
    return NextResponse.json({ page: idx === -1 ? 0 : Math.floor(idx / limit) });
  }

  // 정렬 — sortBy: default(sort_order) | newest(created_at) | title, sortDir: asc | desc
  const sortBy = (searchParams.get("sortBy") || "default") as "default" | "newest" | "title";
  const sortDir = (searchParams.get("sortDir") || "asc") as "asc" | "desc";
  const ascending = sortDir === "asc";

  let query = admin.from("series").select("*", { count: "exact" });

  if (sortBy === "newest") {
    // newest=desc 이 직관적이므로 dir 의 의미를 그대로 사용 (asc=오래된순)
    query = query.order("created_at", { ascending });
  } else if (sortBy === "title") {
    query = query.order("title", { ascending });
  } else {
    // default(추천순) — admin 이 설정한 sort_order 기준, dir 따라 ASC/DESC 가능
    query = query.order("sort_order", { ascending }).order("created_at", { ascending: false });
  }

  if (!showAll) query = query.eq("published", true);
  if (category) query = query.eq("category", category);
  if (q) {
    const esc = q.replace(/[%_]/g, (m) => `\\${m}`);
    if (searchType === "title") {
      query = query.or(`title.ilike.%${esc}%,title_en.ilike.%${esc}%`);
    } else {
      query = query.or(
        `title.ilike.%${esc}%,title_en.ilike.%${esc}%,category.ilike.%${esc}%`,
      );
    }
  }

  if (isPaginated) {
    query = query.range(page * limit, (page + 1) * limit - 1);
  }

  const { data: seriesList, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (seriesList ?? []).map((s) => s.id);
  let postCounts: Record<string, number> = {};
  type PreviewRow = {
    id: string;
    title: string;
    title_en: string | null;
    cover_image: string | null;
    created_at: string;
    excerpt: string | null;
    excerpt_en: string | null;
  };
  const previewsBySeriesId = new Map<string, PreviewRow[]>();

  if (ids.length > 0) {
    const [{ data: counts }, { data: previewPosts }] = await Promise.all([
      admin.from("posts").select("series_id").in("series_id", ids).eq("published", true),
      admin
        .from("posts")
        .select("id, series_id, title, title_en, cover_image, series_order, created_at, excerpt, excerpt_en")
        .eq("published", true)
        .in("series_id", ids)
        .order("series_order", { ascending: true }),
    ]);

    if (counts) {
      postCounts = counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.series_id] = (acc[row.series_id] || 0) + 1;
        return acc;
      }, {});
    }

    for (const row of (previewPosts ?? []) as (PreviewRow & { series_id: string })[]) {
      const arr = previewsBySeriesId.get(row.series_id) ?? [];
      if (arr.length < 4) arr.push({
        id: row.id,
        title: row.title,
        title_en: row.title_en,
        cover_image: row.cover_image,
        created_at: row.created_at,
        excerpt: row.excerpt,
        excerpt_en: row.excerpt_en,
      });
      previewsBySeriesId.set(row.series_id, arr);
    }
  }

  const items = (seriesList ?? []).map((s) => ({
    ...s,
    post_count: postCounts[s.id] || 0,
    previews: previewsBySeriesId.get(s.id) ?? [],
  }));

  if (isPaginated) {
    return NextResponse.json({ items, total: count ?? items.length });
  }

  return NextResponse.json(items);
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

  // 카테고리 미지정 시 "기타"로 기본 설정 (없으면 자동 등록)
  if (!body.category) {
    body.category = "기타";
  }
  await ensurePostCategory(body.category as string);

  const admin = createAdminClient();

  // sort_order 미지정 시 — 현재 max + 1 (맨 뒤)
  if (body.sort_order === undefined || body.sort_order === null) {
    const { data: maxRow } = await admin
      .from("series")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    body.sort_order = (maxRow?.sort_order ?? 0) + 1;
  }

  const { data, error } = await admin.from("series").insert(body).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
