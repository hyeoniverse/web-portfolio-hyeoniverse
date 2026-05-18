import { createAdminClient } from "@/lib/supabase/admin";
import type { Post, Series } from "@/types/post";
import { fetchUnsplashCover } from "@/lib/unsplash";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getPopularPostIds } from "@/lib/popularity";

const POSTS_PER_PAGE = 12;
const SERIES_PER_PAGE = 12;

export async function getInitialPostsData() {
  const admin = createAdminClient();

  const [postsResult, pinnedResult, seriesResult, allPostsResult] = await Promise.all([
    // 1. First page of posts (newest)
    admin
      .from("posts")
      .select("*, series:series_id(title, title_en)", { count: "exact" })
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(0, POSTS_PER_PAGE - 1),

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
  const totalPages = Math.ceil((postsResult.count ?? 0) / POSTS_PER_PAGE);
  const pinnedPosts = (pinnedResult.data ?? []) as Post[];
  const seriesListRaw = (seriesResult.data ?? []) as Series[];
  const seriesTotal = seriesResult.count ?? seriesListRaw.length;

  // 시리즈별 thumb + previews (소속 글, series_order ASC, 최대 4개)
  // — thumbs: 모자이크 cover 용 (cover_image 있는 것만), previews: deck hover 용 (title 포함)
  const seriesIds = seriesListRaw.map((s) => s.id);
  const thumbsBySeriesId = new Map<string, string[]>();
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
  if (seriesIds.length > 0) {
    const { data: previewPosts } = await admin
      .from("posts")
      .select("id, series_id, title, title_en, cover_image, series_order, created_at, excerpt, excerpt_en")
      .eq("published", true)
      .in("series_id", seriesIds)
      .order("series_order", { ascending: true });
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
      return { ...s, thumbs, previews: previewsBySeriesId.get(s.id) ?? [], auto_cover_url };
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

  const allTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

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

/** Tag 페이지용 — tag 로 필터된 첫 페이지 posts + count + 관련 tags (co-occurrence) */
const TAG_PER_PAGE_DEFAULT = 10;
export async function getTagPageData(tag: string, perPage: number = TAG_PER_PAGE_DEFAULT) {
  const admin = createAdminClient();
  const cfg = await getSiteConfig();
  const description = cfg.tagDescriptions?.[tag] ?? "";

  const [postsResult, allTaggedResult] = await Promise.all([
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
  ]);

  const posts = (postsResult.data ?? []) as Post[];
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
    totalCount,
    totalPages,
    relatedTags,
    perPage,
    description,
  };
}

export type TagPageData = Awaited<ReturnType<typeof getTagPageData>>;

/** /posts/tags 인덱스 페이지용 — published 글의 모든 distinct tags + 개수 + 설명 */
export async function getAllTagsData() {
  const admin = createAdminClient();
  const cfg = await getSiteConfig();
  const descriptions = cfg.tagDescriptions ?? {};

  const { data: tagRows } = await admin
    .from("posts")
    .select("tags")
    .eq("published", true)
    .limit(2000);

  const counts = new Map<string, number>();
  for (const row of (tagRows ?? []) as Pick<Post, "tags">[]) {
    if (!row.tags) continue;
    for (const t of row.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  const tags = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({
      tag,
      count,
      description: descriptions[tag] ?? "",
    }));

  return { tags };
}

export type AllTagsData = Awaited<ReturnType<typeof getAllTagsData>>;

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("*, series:series_id(title, title_en)")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  return (data as Post) ?? null;
}

export async function getAllPostSlugs(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("slug")
    .eq("published", true);
  return (data ?? []).map((p: { slug: string }) => p.slug);
}
