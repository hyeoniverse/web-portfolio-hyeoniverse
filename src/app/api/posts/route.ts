import { NextResponse } from "next/server";
import { QUERY_PARAM } from "@/constants";
import { revalidatePath } from "next/cache";
import { titleTooLong, POST_TITLE_MAX } from "@/lib/postConstants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePostCategory, expandPostCategoryFilters } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";
import { applySearchQuery } from "@/lib/api/applySearchQuery";
import type { SyntaxMode } from "@/lib/searchQuery";
import type { PostFormData } from "@/types/post";

// GET /api/posts — 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get(QUERY_PARAM.page) ?? "1");
  const limit = parseInt(searchParams.get(QUERY_PARAM.limit) ?? "12");
  const tag = searchParams.get(QUERY_PARAM.tag);
  // 다중 태그 CSV — tags=a,b,c → 모두 포함된 게시물만 (교집합)
  const tagsParam = searchParams.get("tags");
  const category = searchParams.get(QUERY_PARAM.category);
  const search = searchParams.get("search");
  const searchType = searchParams.get("searchType") ?? "title"; // title | all
  const slug = searchParams.get("slug");
  const showAll = searchParams.get("all") === "true"; // admin용
  const showTrash = searchParams.get("trash") === "true"; // 휴지통

  // 비공개 / 휴지통 조회는 service role 로 RLS 우회 — 반드시 admin 인증 필요
  if (showAll || showTrash) {
    const { error: authError } = await requireAuth();
    if (authError) return authError;
  }

  const supabase = showAll || showTrash ? createAdminClient() : await createClient();

  const sort = searchParams.get(QUERY_PARAM.sort) ?? "newest";
  // popular 정렬의 역방향 지원 — sortDir=asc 면 score 작은 순(비인기순)
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  // 다중 태그 — tags=a,b,c → overlaps 로 하나라도 포함 매치 (PG &&, 합집합/OR)
  const tagList = tagsParam
    ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean)
    : tag
      ? [tag]
      : [];
  // 다중 카테고리 (OR/합집합) — category=a,b,c → 각 확장값(부모→자식 포함) union 후 .in
  const categoryList = category
    ? category.split(",").map((c) => c.trim()).filter(Boolean)
    : [];
  const expandedCategoryValues = categoryList.length > 0
    ? await expandPostCategoryFilters(categoryList)
    : [];
  const pinned = searchParams.get("pinned");
  const seriesId = searchParams.get("series_id");
  const author = searchParams.get("author"); // author id — author_ids 배열에 포함된 게시물만

  // 필터 술어를 한 곳에 모아 page 쿼리와 facet 집계 쿼리가 동일 조건을 공유.
  // (PostgREST 빌더는 mutable 이라 clone 불가 → 새 빌더마다 적용)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const applyFilters = (q: any): any => {
    if (showTrash) q = q.not("deleted_at", "is", null);
    else if (!showAll) q = q.eq("published", true).is("deleted_at", null);
    else q = q.is("deleted_at", null);

    if (tagList.length > 0) q = q.overlaps("tags", tagList);
    if (expandedCategoryValues.length > 0) q = q.in("category", expandedCategoryValues);
    if (slug) q = q.eq("slug", slug);
    if (pinned === "true") q = q.eq("is_pinned", true);
    else if (pinned === "false") q = q.eq("is_pinned", false);
    if (seriesId) q = q.eq("series_id", seriesId);
    if (author) q = q.contains("author_ids", [author]); // PG 배열 포함(cs) — author_ids 에 이 저자 포함
    if (search) {
      const mode = (searchParams.get("syntaxMode") === "regex" ? "regex" : "prefix") as SyntaxMode;
      const columns = searchType === "all"
        ? ["title", "title_en", "content", "content_en"]
        : searchType === "content"
          ? ["content", "content_en"]
          : ["title", "title_en"];
      q = applySearchQuery(q, { search, mode, columns });
    }
    return q;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // 현재 필터에 매칭되는 "전체" 글(페이지 아님)의 태그 빈도 — faceted 사이드바 태그용
  const computeTagFacet = (
    rows: Array<{ tags?: string[] | null }>,
  ): Array<{ tag: string; count: number }> => {
    const m = new Map<string, number>();
    for (const r of rows) for (const t of r.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  };

  let query = applyFilters(
    supabase.from("posts").select("*, series:series_id(title, title_en)", { count: "exact" }),
  );

  // 시리즈 필터링 시에는 series_order ASC 우선 (시리즈 안의 순서대로 보이도록)
  // — 동률은 사용자가 선택한 sort 로 폴백
  if (seriesId) {
    query = query.order("series_order", { ascending: true, nullsFirst: false });
  }

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "title") {
    query = query.order("title", { ascending: sortDir !== "desc" });
  } else if (sort === "author") {
    // 저자별 — author_ids 배열을 요소순으로 정렬(같은 저자끼리 묶임). 동률은 최신순 tie-break.
    query = query
      .order("author_ids", { ascending: sortDir !== "desc", nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (sort === "random") {
    // random — 서버에서 정렬은 created_at desc 로 뽑고 JS 가 시드 기반으로 셔플
    query = query.order("created_at", { ascending: false });
  } else if (sort === "views") {
    query = query
      .order("view_count", { ascending: sortDir === "asc" })
      .order("created_at", { ascending: false });
  } else if (sort === "likes") {
    // tied like_count 인 post 들이 매 응답마다 다른 순서 → 페이징 시 중복/누락 가능 → created_at 으로 stable tie-break
    query = query
      .order("like_count", { ascending: sortDir === "asc" })
      .order("created_at", { ascending: false });
  } else if (sort !== "popular" && sort !== "comments") {
    query = query.order("created_at", { ascending: false });
  }

  // popular / comments: 둘 다 comments(count) join 후 JS 정렬
  // — 시리즈 필터링 중엔 series_order 가 이미 우선 적용 (위에서 처리)
  if ((sort === "popular" || sort === "comments") && !seriesId) {
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
      const score = sort === "comments"
        ? commentCount
        : p.view_count + p.like_count * 3 + commentCount * 5;
      return { ...p, _score: score, comments: undefined };
    });
    scored.sort((a, b) => sortDir === "asc" ? a._score - b._score : b._score - a._score);

    const from = (page - 1) * limit;
    const paged = scored.slice(from, from + limit).map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      posts: paged,
      total: totalCount ?? 0,
      page,
      totalPages: Math.ceil((totalCount ?? 0) / limit),
      facets: computeTagFacet((rawData ?? []) as Array<{ tags?: string[] | null }>),
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
      facets: computeTagFacet((rawData ?? []) as Array<{ tags?: string[] | null }>),
    });
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // faceted 사이드바 태그 — 공개 목록에서만, 같은 필터로 tags 만 집계(range 없이 전체 매칭셋)
  let facets: Array<{ tag: string; count: number }> = [];
  if (!showAll && !showTrash) {
    const { data: facetRows } = await applyFilters(supabase.from("posts").select("tags"));
    facets = computeTagFacet((facetRows ?? []) as Array<{ tags?: string[] | null }>);
  }

  const res = NextResponse.json({
    posts: data,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
    facets,
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

  // 제목 길이 제한 (UI·DB 와 동일 상한)
  if (titleTooLong(body.title) || titleTooLong(body.title_en)) {
    return NextResponse.json({ error: `title exceeds ${POST_TITLE_MAX} characters` }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("posts").insert(body).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 발행 상태로 생성되면 공개 목록/홈 캐시 즉시 무효화
  if (data?.published) {
    revalidatePath("/posts");
    revalidatePath("/");
    if (data.slug) revalidatePath(`/posts/${data.slug}`);
  }

  return NextResponse.json(data, { status: 201 });
}
