import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePostCategory } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";
import { escapeOrSearch } from "@/lib/api/search";
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
  // popular 정렬의 역방향 지원 — sortDir=asc 면 score 작은 순(비인기순)
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

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
    const s = escapeOrSearch(search);
    if (searchType === "all") {
      query = query.or(`title.ilike.%${s}%,title_en.ilike.%${s}%,content.ilike.%${s}%,content_en.ilike.%${s}%`);
    } else if (searchType === "content") {
      query = query.or(`content.ilike.%${s}%,content_en.ilike.%${s}%`);
    } else {
      query = query.or(`title.ilike.%${s}%,title_en.ilike.%${s}%`);
    }
  }

  // 시리즈 필터링 시에는 series_order ASC 우선 (시리즈 안의 순서대로 보이도록)
  // — 동률은 사용자가 선택한 sort 로 폴백
  if (seriesId) {
    query = query.order("series_order", { ascending: true, nullsFirst: false });
  }

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "title") {
    query = query.order("title", { ascending: sortDir !== "desc" });
  } else if (sort === "random") {
    // random — 서버에서 정렬은 created_at desc 로 뽑고 JS 가 시드 기반으로 셔플
    query = query.order("created_at", { ascending: false });
  } else if (sort !== "popular") {
    query = query.order("created_at", { ascending: false });
  }

  // popular: 복합 점수 (views + likes*3 + comments*5) → JS 정렬
  // — 단, 시리즈 필터링 중에는 series_order 가 이미 우선 적용되어 위에서 처리됨
  if (sort === "popular" && !seriesId) {
    // Supabase 쿼리 빌더는 .select() chain 호출의 반환 타입을 추론 못 해 unknown 으로 처리 → 좁은 row shape 로 캐스팅
    const selectWithComments = (query as unknown as { select: (cols: string, opts: { count: "exact" }) => unknown })
      .select("*, series:series_id(title, title_en), comments(count)", { count: "exact" });
    const { data: rawData, count: totalCount, error: popError } = (await selectWithComments) as {
      data: Array<Record<string, unknown> & { view_count: number; like_count: number; comments?: Array<{ count: number }> }> | null;
      count: number | null;
      error: { message: string } | null;
    };

    if (popError) {
      return NextResponse.json({ error: popError.message }, { status: 500 });
    }

    const scored = (rawData ?? []).map((p) => {
      const commentCount = Array.isArray(p.comments) ? (p.comments[0]?.count ?? 0) : 0;
      return { ...p, _score: p.view_count + p.like_count * 3 + commentCount * 5, comments: undefined };
    });
    scored.sort((a, b) => sortDir === "asc" ? a._score - b._score : b._score - a._score);

    const from = (page - 1) * limit;
    const paged = scored.slice(from, from + limit).map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      posts: paged,
      total: totalCount ?? 0,
      page,
      totalPages: Math.ceil((totalCount ?? 0) / limit),
    });
  }

  // random 정렬 — 전체 fetch 후 seed 기반 셔플 + 페이지 슬라이스
  if (sort === "random") {
    const { data: rawData, count: totalCount, error: rndError } = await query;
    if (rndError) {
      return NextResponse.json({ error: rndError.message }, { status: 500 });
    }
    const seedStr = searchParams.get("seed") ?? "0";
    let seed = parseInt(seedStr, 10) || 1;
    const all = (rawData ?? []) as unknown[];
    // mulberry32 seeded shuffle
    const rand = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const fromR = (page - 1) * limit;
    return NextResponse.json({
      posts: shuffled.slice(fromR, fromR + limit),
      total: totalCount ?? all.length,
      page,
      totalPages: Math.ceil((totalCount ?? all.length) / limit),
    });
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const res = NextResponse.json({
    posts: data,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
  // 공개 목록은 짧은 TTL + stale-while-revalidate
  if (!showAll && !showTrash) {
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  }
  return res;
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

  // 카테고리 직접 입력 시 자동 등록 (기존 목록에 없으면)
  if (body.category) {
    await ensurePostCategory(body.category as string);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("posts").insert(body).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
