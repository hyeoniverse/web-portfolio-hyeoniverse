import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorksProjects } from "@/lib/getWorksProjects";
import { SITE_ORIGIN } from "@/lib/seo";

/* /sitemap.xml — 공개 화면과 발행된 글 · 작업물 · 시리즈. 한 시간마다 새로 만든다
   (글을 발행하면 길어도 한 시간 안에 들어간다). 조회가 실패하면 그 묶음만 빼고 나머지는 낸다 */
export const revalidate = 3600;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/works", priority: 0.9, changeFrequency: "weekly" },
  { path: "/posts", priority: 0.9, changeFrequency: "daily" },
  { path: "/profile", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/posts/series", priority: 0.5, changeFrequency: "weekly" },
  { path: "/posts/categories", priority: 0.4, changeFrequency: "weekly" },
  { path: "/posts/tags", priority: 0.4, changeFrequency: "weekly" },
  { path: "/posts/history", priority: 0.4, changeFrequency: "weekly" },
  { path: "/posts/til", priority: 0.4, changeFrequency: "daily" },
  { path: "/design-system", priority: 0.3, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.1, changeFrequency: "monthly" },
];

const url = (path: string) => `${SITE_ORIGIN}${path === "/" ? "" : path}`;

async function postEntries(): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await createAdminClient()
    .from("posts")
    .select("slug, updated_at")
    .eq("published", true)
    .is("deleted_at", null);
  if (error || !data) return [];
  return data
    .filter((p: { slug: string }) => p.slug)
    .map((p: { slug: string; updated_at: string | null }) => ({
      url: url(`/posts/${encodeURIComponent(p.slug)}`),
      lastModified: p.updated_at ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
}

async function seriesEntries(): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await createAdminClient()
    .from("series")
    .select("slug, updated_at")
    .eq("published", true);
  if (error || !data) return [];
  return data
    .filter((s: { slug: string }) => s.slug)
    .map((s: { slug: string; updated_at: string | null }) => ({
      url: url(`/posts/series/${encodeURIComponent(s.slug)}`),
      lastModified: s.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
}

async function workEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const projects = await getWorksProjects();
    return projects.map((p) => ({
      url: url(`/works/${encodeURIComponent(p.slug || p.id)}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, series, works] = await Promise.all([postEntries(), seriesEntries(), workEntries()]);
  return [
    ...STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({ url: url(path), changeFrequency, priority })),
    ...works,
    ...posts,
    ...series,
  ];
}
