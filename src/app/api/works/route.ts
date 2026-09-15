import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { QUERY_PARAM } from "@/constants";
import { ensureWorksCategory } from "@/lib/api/validateCategory";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { placeWork } from "@/lib/api/placeWork";
import { revalidatePublicWorks } from "@/lib/api/revalidateWorks";
import { applySearchQuery } from "@/lib/api/applySearchQuery";
import type { SyntaxMode } from "@/lib/searchQuery";
// GET /api/works — 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true"; // admin용
  const showTrash = searchParams.get("trash") === "true"; // 휴지통
  const page = parseInt(searchParams.get(QUERY_PARAM.page) ?? "0");
  const limit = parseInt(searchParams.get(QUERY_PARAM.limit) ?? "0");
  const sort = searchParams.get(QUERY_PARAM.sort) ?? "order";
  const category = searchParams.get(QUERY_PARAM.category);
  const nature = searchParams.get("nature");
  const year = searchParams.get("year");
  const search = searchParams.get("search") ?? "";
  const searchType = searchParams.get("searchType") ?? "title";

  /* ?all / ?trash 는 비공개 / 휴지통. 세션 클라이언트로 읽어 무엇이 보이는지를
     works_admin_select(is_admin) 정책이 정하게 한다. 공개 경로는 anon 으로 가고
     works_public_read(published AND deleted_at IS NULL)가 거른다. */
  let supabase = await createClient();
  if (showAll || showTrash) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    supabase = auth.supabase;
  }

  let query = supabase.from("works").select("*", { count: "exact" });

  if (showTrash) {
    query = query.not("deleted_at", "is", null);
  } else if (!showAll) {
    query = query.eq("published", true).is("deleted_at", null);
  } else {
    query = query.is("deleted_at", null);
  }

  if (category) {
    // categories_ko 배열에 해당 값을 포함하는 row 만 (array containment)
    query = query.contains("categories_ko", [category]);
  }
  if (nature) {
    query = query.eq("nature_ko", nature);
  }
  if (year) {
    query = query.eq("year", year);
  }

  const syntaxMode = (searchParams.get("syntaxMode") === "regex" ? "regex" : "prefix") as SyntaxMode;
  const searchColumns = searchType === "all"
    ? ["title", "title_en", "subtitle_ko", "subtitle_en", "content_ko", "content_en"]
    : searchType === "content"
      ? ["content_ko", "content_en"]
      : ["title", "title_en", "subtitle_ko", "subtitle_en"];

  if (search) {
    query = applySearchQuery(query, { search, mode: syntaxMode, columns: searchColumns });
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
    if (category) fallback = fallback.contains("categories_ko", [category]);
    if (nature) fallback = fallback.eq("nature_ko", nature);
    if (year) fallback = fallback.eq("year", year);
    if (search) {
      fallback = applySearchQuery(fallback, { search, mode: syntaxMode, columns: searchColumns });
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
    return jsonServerError(error, "GET /api/works");
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
  "slug", "title", "title_en",
  "subtitle_ko", "subtitle_en",
  "categories_ko", "categories_en",
  "nature_ko", "nature_en",
  "year",
  "description_ko", "description_en",
  "role_ko", "role_en",
  "contributions_ko", "contributions_en",
  "tech", "tech_notes", "image", "icon",
  "content_ko", "content_en", "content_type",
  "overview_ko", "overview_en", "overview_image",
  "challenge_ko", "challenge_en", "challenge_image",
  "solution_ko", "solution_en", "solution_image",
  "team_members", "gallery",
  "live_url", "github_url",
  "published", "sort_order", "is_pinned",
]);

export async function POST(request: Request) {
  /* 작업물에는 author_ids 가 없어 소유권 개념이 없다 — admin 이상만 만든다.
     정책(works_admin_write)도 같은 규칙이라 등급을 못 넘으면 여기서 명확한 403 이 난다. */
  const { supabase, error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const body = await request.json();
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) filtered[key] = body[key];
  }

  // 카테고리 직접 입력 시 자동 등록 — array 안의 각 항목을 ensure
  const newCatsKo = Array.isArray(filtered.categories_ko) ? filtered.categories_ko as string[] : [];
  const newCatsEn = Array.isArray(filtered.categories_en) ? filtered.categories_en as string[] : [];
  for (let i = 0; i < newCatsKo.length; i++) {
    const ko = newCatsKo[i] || "";
    const en = newCatsEn[i] || "";
    if (ko || en) await ensureWorksCategory(ko, en);
  }


  /* 새 작업물은 일단 맨 뒤(max + 1)에 넣고, 자리를 받았으면 그 자리로 옮기며 나머지를 다시 매긴다 — PATCH 와 같은
     placeWork(#873). 자리가 없거나 0 이면 맨 뒤. 예전에는 1 을 "정하지 않음"으로 봐 맨 앞에 두려던 새 작업물이
     맨 뒤로 갔고, 그 밖의 자리는 다시 매기지 않아 번호가 겹쳤다 */
  const position = typeof filtered.sort_order === "number" && filtered.sort_order >= 1 ? filtered.sort_order : null;
  const { data: maxRow } = await supabase
    .from("works")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  filtered.sort_order = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("works")
    .insert(filtered)
    .select()
    .single();

  if (error) {
    return jsonServerError(error, "POST /api/works");
  }

  if (position !== null && position < (filtered.sort_order as number)) {
    await placeWork(supabase, data.id, position);
    const { data: placed } = await supabase.from("works").select("*").eq("id", data.id).single();
    revalidatePublicWorks();
    return NextResponse.json(placed ?? data, { status: 201 });
  }

  revalidatePublicWorks();
  return NextResponse.json(data, { status: 201 });
}
