import { createAdminClient } from "@/lib/supabase/admin";
import type { Post, Series } from "@/types/post";

const POSTS_PER_PAGE = 12;

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

    // 3. Series list
    admin
      .from("series")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false }),

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
  const seriesList = (seriesResult.data ?? []) as Series[];

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

  const popularIds = [...allPosts]
    .filter((p) => p.view_count > 0)
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 5)
    .map((p) => p.id);

  return {
    posts,
    totalPages,
    pinnedPosts,
    seriesList,
    allTags,
    extraCategories,
    popularIds,
  };
}

export type InitialPostsData = Awaited<ReturnType<typeof getInitialPostsData>>;

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
