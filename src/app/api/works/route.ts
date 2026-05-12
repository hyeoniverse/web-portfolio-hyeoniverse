import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureWorksCategory } from "@/lib/api/validateCategory";
import { requireAuth } from "@/lib/api/requireAuth";
import { escapeOrSearch } from "@/lib/api/search";
// GET /api/works — 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true"; // admin용
  const showTrash = searchParams.get("trash") === "true"; // 휴지통
  const page = parseInt(searchParams.get("page") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "0");
  const sort = searchParams.get("sort") ?? "order";
  const category = searchParams.get("category");
  const year = searchParams.get("year");
  const search = searchParams.get("search") ?? "";
  const searchType = searchParams.get("searchType") ?? "title";

  const supabase = createAdminClient();

  let query = supabase.from("works").select("*", { count: "exact" });

  if (showTrash) {
    query = query.not("deleted_at", "is", null);
  } else if (!showAll) {
    query = query.eq("published", true).is("deleted_at", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (category) {
    query = query.eq("category_ko", category);
  }
  if (year) {
    query = query.eq("year", year);
  }

  if (search) {
    const s = escapeOrSearch(search);
    if (searchType === "all") {
      query = query.or(`title.ilike.%${s}%,subtitle_ko.ilike.%${s}%,subtitle_en.ilike.%${s}%,content_ko.ilike.%${s}%,content_en.ilike.%${s}%`);
    } else if (searchType === "content") {
      query = query.or(`content_ko.ilike.%${s}%,content_en.ilike.%${s}%`);
    } else {
      query = query.or(`title.ilike.%${s}%,subtitle_ko.ilike.%${s}%,subtitle_en.ilike.%${s}%`);
    }
  }

  if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "name") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("sort_order", { ascending: true });
  }

  // 페이지네이션 (page/limit 둘 다 있을 때만 적용)
  if (page > 0 && limit > 0) {
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);
  }

  let { data, count, error } = await query;

  // deleted_at 컬럼이 아직 없는 경우 fallback — 컬럼 필터 없이 재조회
  if (error?.message?.includes("deleted_at")) {
    let fallback = supabase.from("works").select("*", { count: "exact" });
    if (!showAll && !showTrash) fallback = fallback.eq("published", true);
    if (category) fallback = fallback.eq("category_ko", category);
    if (year) fallback = fallback.eq("year", year);
    if (search) {
      const s = escapeOrSearch(search);
      if (searchType === "all") {
        fallback = fallback.or(`title.ilike.%${s}%,subtitle_ko.ilike.%${s}%,subtitle_en.ilike.%${s}%,content_ko.ilike.%${s}%,content_en.ilike.%${s}%`);
      } else if (searchType === "content") {
        fallback = fallback.or(`content_ko.ilike.%${s}%,content_en.ilike.%${s}%`);
      } else {
        fallback = fallback.or(`title.ilike.%${s}%,subtitle_ko.ilike.%${s}%,subtitle_en.ilike.%${s}%`);
      }
    }
    if (sort === "newest") fallback = fallback.order("created_at", { ascending: false });
    else if (sort === "oldest") fallback = fallback.order("created_at", { ascending: true });
    else if (sort === "name") fallback = fallback.order("title", { ascending: true });
    else fallback = fallback.order("sort_order", { ascending: true });
    if (page > 0 && limit > 0) {
      const from = (page - 1) * limit;
      fallback = fallback.range(from, from + limit - 1);
    }
    ({ data, count, error } = await fallback);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  const res = NextResponse.json({
    works: data,
    total,
    page: page || 1,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
  });
  if (!showAll && !showTrash) {
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  }
  return res;
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
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) filtered[key] = body[key];
  }

  // 카테고리 직접 입력 시 자동 등록 (기존 목록에 없으면)
  if (filtered.category_ko || filtered.category_en) {
    await ensureWorksCategory(
      (filtered.category_ko as string) ?? "",
      (filtered.category_en as string) ?? "",
    );
  }

  const admin = createAdminClient();

  // 새 work 의 sort_order 가 명시되지 않았거나 기본값(1) 이면, 현재 max + 1 로 자동 설정 (맨 뒤)
  if (filtered.sort_order === undefined || filtered.sort_order === 1) {
    const { data: maxRow } = await admin
      .from("works")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    filtered.sort_order = (maxRow?.sort_order ?? 0) + 1;
  }

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
