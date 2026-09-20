import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Post, Series } from "@/types/post";
import { fetchUnsplashCover } from "@/lib/unsplash";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getPopularPostIds } from "@/lib/popularity";
import { topPostCategory } from "@/lib/seriesCategory";

/**
 * 첫 화면에 서버가 내려보내는 글 수.
 *
 * 화면 쪽은 설정(`posts.perPage`)을 따르므로 여기서도 같은 값을 읽는다. 예전에는 12로
 * 고정돼 있어서, 서버가 12개로 그린 뒤 화면이 설정값(10개)으로 다시 그렸다.
 * 카드 두 장이 사라지며 그 아래가 통째로 위로 당겨졌다(레이아웃 밀림 0.313).
 */
async function getPostsPerPage() {
  const cfg = await getSiteConfig();
  return cfg.posts?.perPage ?? 12;
}
const SERIES_PER_PAGE = 12;

export async function getInitialPostsData() {
  const admin = createAdminClient();
  const perPage = await getPostsPerPage();

  const [postsResult, pinnedResult, seriesResult, allPostsResult] = await Promise.all([
    // 1. First page of posts (newest)
    admin
      .from("posts")
      .select("*, series:series_id(title, title_en)", { count: "exact" })
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(0, perPage - 1),

    // 2. Pinned posts
    admin
      .from("posts")
      .select("*, series:series_id(title, title_en)")
      .eq("published", true)
      .eq("is_pinned", true)
      .order("created_at", { ascending: false })
      .limit(10),

    // 3. Series list — sort_order ASC (admin/settings 에서 설정한 순서)
    //    첫 페이지만 불러오고 클라이언트에서 가로 스크롤 끝에 다다르면 추가 로드
    admin
      .from("series")
      .select("*", { count: "exact" })
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(0, SERIES_PER_PAGE - 1),

    // 4. All posts for tags/categories derivation
    admin
      .from("posts")
      .select("id, tags, category, view_count")
      .eq("published", true)
      .limit(100),
  ]);

  const posts = (postsResult.data ?? []) as Post[];
  const totalPages = Math.ceil((postsResult.count ?? 0) / perPage);
  const pinnedPosts = (pinnedResult.data ?? []) as Post[];
  const seriesListRaw = (seriesResult.data ?? []) as Series[];
  const seriesTotal = seriesResult.count ?? seriesListRaw.length;

  // 시리즈별 thumb + previews (소속 글, series_order ASC, 최대 4개)
  // — thumbs: 모자이크 cover 용 (cover_image 있는 것만), previews: deck hover 용 (title 포함)
  const seriesIds = seriesListRaw.map((s) => s.id);
  const thumbsBySeriesId = new Map<string, string[]>();
  type PreviewRow = {
    id: string;
    slug: string;
    title: string;
    title_en: string | null;
    cover_image: string | null;
    created_at: string;
    excerpt: string | null;
    excerpt_en: string | null;
  };
  const previewsBySeriesId = new Map<string, PreviewRow[]>();
  const postCountBySeriesId = new Map<string, number>();
  if (seriesIds.length > 0) {
    const { data: previewPosts } = await admin
      .from("posts")
      .select("id, slug, series_id, title, title_en, cover_image, series_order, created_at, excerpt, excerpt_en")
      .eq("published", true)
      .in("series_id", seriesIds)
      .order("series_order", { ascending: true });
    for (const row of (previewPosts ?? []) as (PreviewRow & { series_id: string })[]) {
      postCountBySeriesId.set(row.series_id, (postCountBySeriesId.get(row.series_id) ?? 0) + 1);
      const arr = previewsBySeriesId.get(row.series_id) ?? [];
      if (arr.length < 4) arr.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        title_en: row.title_en,
        cover_image: row.cover_image,
        created_at: row.created_at,
        excerpt: row.excerpt,
        excerpt_en: row.excerpt_en,
      });
      previewsBySeriesId.set(row.series_id, arr);

      if (row.cover_image) {
        const tarr = thumbsBySeriesId.get(row.series_id) ?? [];
        if (tarr.length < 4) tarr.push(row.cover_image);
        thumbsBySeriesId.set(row.series_id, tarr);
      }
    }
  }
  // 시리즈별로 cover 도 thumbs 도 없으면 Unsplash 에서 자동 fetch
  // DB 의 series.auto_cover_url 캐시 우선 사용 — 한번 fetch 한 URL 은 영구 저장
  const seriesList: Series[] = await Promise.all(
    seriesListRaw.map(async (s) => {
      const thumbs = thumbsBySeriesId.get(s.id) ?? [];
      const needAuto = !s.cover_image && thumbs.length === 0;
      // DB 에 캐시된 URL 이 있으면 그대로 사용
      const cached = (s as Series & { auto_cover_url?: string }).auto_cover_url;
      let auto_cover_url: string | undefined = cached || undefined;

      if (needAuto && !auto_cover_url) {
        const query = (s.title_en || s.title || s.category || "").trim();
        const url = await fetchUnsplashCover(query);
        if (url) {
          auto_cover_url = url;
          // DB 에 저장 — 다음 요청부터 Unsplash 안 부름
          admin
            .from("series")
            .update({ auto_cover_url: url })
            .eq("id", s.id)
            .then(({ error }) => {
              if (error) console.warn(`[posts] failed to cache auto_cover_url for ${s.id}:`, error.message);
            });
        }
      }
      return {
        ...s,
        thumbs,
        previews: previewsBySeriesId.get(s.id) ?? [],
        post_count: postCountBySeriesId.get(s.id) ?? 0,
        auto_cover_url,
      };
    }),
  );

  // Derive tags, categories, popular IDs from all posts
  const tagCounts = new Map<string, number>();
  const categorySet = new Set<string>();
  const allPosts = (allPostsResult.data ?? []) as Pick<Post, "id" | "tags" | "category" | "view_count">[];

  for (const p of allPosts) {
    if (p.tags) p.tags.forEach((t: string) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
    if (p.category) categorySet.add(p.category);
  }

  // tagDescriptions 도 함께 — 새 포맷 (이름 + 설명 bilingual) 또는 legacy 모두 처리.
  // description 은 client/server 양쪽에서 normalize 가능하게 raw 전달 (lib/tagMeta 의 normalizeTagMeta 사용 가능).
  const cfgForTags = await getSiteConfig();
  const tagDescriptions = cfgForTags.tagDescriptions ?? {};
  const allTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => {
      const raw = tagDescriptions[tag];
      // 검색용 - 모든 텍스트를 하나로 합쳐서 사용
      let description = "";
      if (typeof raw === "string") description = raw;
      else if (raw) {
        if ("description" in raw && raw.description) {
          description = raw.description.ko || raw.description.en || "";
        } else if ("ko" in raw || "en" in raw) {
          // legacy bilingual desc
          description = (raw as { ko?: string }).ko || (raw as { en?: string }).en || "";
        }
      }
      return { tag, count, description, meta: raw };
    });

  const extraCategories = Array.from(categorySet);

  // 인기글 — score (view + like*3 + comments*5) top 5. lib/popularity 단일 소스.
  const popularIds = Array.from(await getPopularPostIds(admin, 5));

  // 배너용: pinned가 3개 미만이면 인기 게시물로 채움
  const MIN_BANNER = 3;
  let bannerPosts = [...pinnedPosts];
  if (bannerPosts.length < MIN_BANNER) {
    const pinnedIds = new Set(bannerPosts.map((p) => p.id));
    const hotPosts = posts
      .filter((p) => !pinnedIds.has(p.id))
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, MIN_BANNER - bannerPosts.length);
    bannerPosts = [...bannerPosts, ...hotPosts];
  }

  return {
    posts,
    totalPages,
    pinnedPosts: bannerPosts,
    seriesList,
    seriesTotal,
    seriesPerPage: SERIES_PER_PAGE,
    allTags,
    extraCategories,
    popularIds,
  };
}

export type InitialPostsData = Awaited<ReturnType<typeof getInitialPostsData>>;

/** tagDescriptions raw entry → 표시용 string (KO 우선, fallback EN). legacy string / bilingual desc / 신규 { ko, en, description: { ko, en } } 모두 처리. */
function normalizeTagDescString(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw !== "object") return "";
  const r = raw as { description?: unknown; ko?: string; en?: string };
  if (r.description) {
    if (typeof r.description === "string") return r.description;
    const d = r.description as { ko?: string; en?: string };
    return d.ko || d.en || "";
  }
  return r.ko || r.en || "";
}

/** Tag 페이지용 — tag 로 필터된 첫 페이지 posts + count + 관련 tags (co-occurrence) */
const TAG_PER_PAGE_DEFAULT = 10;
export async function getTagPageData(tag: string, perPage: number = TAG_PER_PAGE_DEFAULT) {
  const admin = createAdminClient();
  const cfg = await getSiteConfig();
  const description = normalizeTagDescString(cfg.tagDescriptions?.[tag]);

  const [postsResult, allTaggedResult, worksResult] = await Promise.all([
    // tag 가 포함된 첫 페이지 posts (count 포함)
    admin
      .from("posts")
      .select("*, series:series_id(title, title_en)", { count: "exact" })
      .eq("published", true)
      .contains("tags", [tag])
      .order("created_at", { ascending: false })
      .range(0, perPage - 1),
    // co-occurrence — tag 포함 posts 의 모든 tags
    admin
      .from("posts")
      .select("tags")
      .eq("published", true)
      .contains("tags", [tag])
      .limit(500),
    // 통합 태그 페이지 — 같은 tag(=tech) 를 쓰는 published works (공유 어휘)
    admin
      .from("works")
      .select("id, title, title_en, slug, subtitle_ko, subtitle_en, image, tech, year")
      .eq("published", true)
      .contains("tech", [tag])
      .order("sort_order", { ascending: true })
      .limit(12),
  ]);

  const posts = (postsResult.data ?? []) as Post[];
  const works = (worksResult.data ?? []) as TagWork[];
  const totalCount = postsResult.count ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  // 관련 tag — 이 tag 와 함께 등장한 다른 tag 들 (count 순)
  const relatedCounts = new Map<string, number>();
  for (const row of (allTaggedResult.data ?? []) as Pick<Post, "tags">[]) {
    if (!row.tags) continue;
    for (const t of row.tags) {
      if (t === tag) continue;
      relatedCounts.set(t, (relatedCounts.get(t) ?? 0) + 1);
    }
  }
  const relatedTags = Array.from(relatedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t, count]) => ({ tag: t, count }));

  return {
    posts,
    works,
    totalCount,
    totalPages,
    relatedTags,
    perPage,
    description,
  };
}

/** 통합 태그 페이지에서 표시할 work 요약 (tech 공유 어휘) */
interface TagWork {
  id: string;
  title: string;
  title_en: string;
  slug: string;
  subtitle_ko: string;
  subtitle_en: string;
  image: string;
  tech: string[];
  year: string | number | null;
}

export type TagPageData = Awaited<ReturnType<typeof getTagPageData>>;

/** /posts/tags 인덱스 페이지용 — published 글의 모든 distinct tags + 개수 + 설명 + 연관 태그 */
export async function getAllTagsData() {
  const admin = createAdminClient();
  const cfg = await getSiteConfig();
  const descriptions = cfg.tagDescriptions ?? {};

  const { data: tagRows } = await admin
    .from("posts")
    .select("tags")
    .eq("published", true)
    .limit(2000);

  const rows = (tagRows ?? []) as Pick<Post, "tags">[];

  // count + co-occurrence — 같은 글에 함께 쓰인 태그 쌍 카운트
  const counts = new Map<string, number>();
  const cooc = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.tags) continue;
    const ts = Array.from(new Set(row.tags));
    for (const t of ts) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i];
        const b = ts[j];
        if (!cooc.has(a)) cooc.set(a, new Map());
        if (!cooc.has(b)) cooc.set(b, new Map());
        const ma = cooc.get(a)!;
        const mb = cooc.get(b)!;
        ma.set(b, (ma.get(b) ?? 0) + 1);
        mb.set(a, (mb.get(a) ?? 0) + 1);
      }
    }
  }

  // 각 태그의 related — co-occurrence 상위 5개
  const RELATED_LIMIT = 5;
  const getRelated = (tag: string): string[] => {
    const m = cooc.get(tag);
    if (!m) return [];
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, RELATED_LIMIT)
      .map(([t]) => t);
  };

  const tags = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({
      tag,
      count,
      description: normalizeTagDescString(descriptions[tag]),
      related: getRelated(tag),
    }));

  return { tags };
}

export type AllTagsData = Awaited<ReturnType<typeof getAllTagsData>>;

/** 요청 안에서는 slug 마다 한 번만 조회한다 — 글 상세의 레이아웃·메타데이터·페이지가 함께 부른다(#891) */
export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("*, series:series_id(title, title_en)")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  return (data as Post) ?? null;
});

export async function getAllPostSlugs(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("slug")
    .eq("published", true);
  return (data ?? []).map((p: { slug: string }) => p.slug);
}

/** /posts/series 인덱스 페이지용 — 모든 시리즈 + 글 수 + 카테고리 + 첫 글 cover (preview) */
export async function getAllSeriesData() {
  const admin = createAdminClient();
  const { data: seriesRaw } = await admin
    .from("series")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const seriesList = (seriesRaw ?? []) as Series[];
  const ids = seriesList.map((s) => s.id);

  const postCounts: Record<string, number> = {};
  const firstCoverBySeriesId: Record<string, string | null> = {};
  /* 시리즈 카테고리는 소속 글에서 도출한다 — series.category 컬럼은 legacy(#326) */
  const categoriesBySeriesId: Record<string, string[]> = {};

  if (ids.length > 0) {
    const { data: postsRaw } = await admin
      .from("posts")
      .select("series_id, cover_image, series_order, category")
      .eq("published", true)
      .in("series_id", ids)
      .order("series_order", { ascending: true });
    for (const row of (postsRaw ?? []) as { series_id: string; cover_image: string | null; series_order: number; category: string | null }[]) {
      postCounts[row.series_id] = (postCounts[row.series_id] ?? 0) + 1;
      (categoriesBySeriesId[row.series_id] ??= []).push(row.category ?? "");
      if (!(row.series_id in firstCoverBySeriesId)) {
        firstCoverBySeriesId[row.series_id] = row.cover_image;
      }
    }
  }

  return {
    series: seriesList.map((s) => ({
      ...s,
      category: topPostCategory(categoriesBySeriesId[s.id] ?? []),
      post_count: postCounts[s.id] ?? 0,
      first_cover: firstCoverBySeriesId[s.id] ?? null,
    })),
  };
}


/** /posts/series/[slug] 상세 페이지용 — 시리즈 하나 + 소속 글(series_order 순).
   목록 필터(/posts?series=)와 달리 연재 순서(series_order)대로 돌려준다. */
export async function getSeriesPageData(slug: string) {
  const admin = createAdminClient();
  const { data: seriesRaw } = await admin
    .from("series")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  const series = (seriesRaw as Series) ?? null;
  if (!series) return { series: null as Series | null, posts: [] as Post[], totalCount: 0 };

  const { data: postsRaw } = await admin
    .from("posts")
    .select("*, series:series_id(title, title_en)")
    .eq("published", true)
    .eq("series_id", series.id)
    .order("series_order", { ascending: true })
    .order("created_at", { ascending: true });
  const posts = (postsRaw ?? []) as Post[];
  /* 상세 머리의 카테고리도 같은 기준 — 소속 글 중 가장 많은 것 */
  series.category = topPostCategory(posts.map((p) => p.category));

  return { series: { ...series, post_count: posts.length }, posts, totalCount: posts.length };
}

export type SeriesPageData = Awaited<ReturnType<typeof getSeriesPageData>>;

/** 시리즈 상세 정적 파라미터용 — published 시리즈의 slug 목록 */
export async function getAllSeriesSlugs(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("series")
    .select("slug")
    .eq("published", true);
  return (data ?? []).map((s: { slug: string }) => s.slug).filter(Boolean);
}

/** /posts/categories 인덱스 페이지용 — published posts 의 모든 distinct 카테고리 + 글 수 + 첫 글 cover */
export async function getAllCategoriesData() {
  const admin = createAdminClient();
  const { data: postsRaw } = await admin
    .from("posts")
    .select("category, cover_image, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const cats = new Map<string, { count: number; firstCover: string | null }>();
  for (const row of (postsRaw ?? []) as { category: string | null; cover_image: string | null }[]) {
    if (!row.category) continue;
    const entry = cats.get(row.category);
    if (entry) {
      entry.count++;
    } else {
      cats.set(row.category, { count: 1, firstCover: row.cover_image });
    }
  }

  return {
    categories: Array.from(cats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, v]) => ({ name, count: v.count, first_cover: v.firstCover })),
  };
}


/** /posts/history 타임라인 왼쪽 월 인덱스용 — 전체 published posts 의 유효일(scheduled_at ?? created_at)
 *  문자열만 최신순으로 반환. 월 버킷팅/라벨은 클라이언트에서(브라우저 타임존 기준 marker id 와 일치하도록). */
export async function getPostArchiveMonths(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("scheduled_at, created_at")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);
  return ((data ?? []) as { scheduled_at: string | null; created_at: string | null }[])
    .map((r) => r.scheduled_at ?? r.created_at)
    .filter((d): d is string => !!d);
}
