import type { Post } from "@/types/post";

/**
 * 시리즈에 속한 포스트의 제목을 "시리즈명 #N - 제목" 형식으로 반환.
 * 시리즈가 없으면 원본 제목 그대로 반환.
 * lang이 "en"이면 title_en / series.title_en 우선 사용.
 */
export function formatPostTitle(post: Post, lang?: "ko" | "en"): string {
  const title = (lang === "en" && post.title_en) ? post.title_en : post.title;
  if (!post.series_id || !post.series) return title;
  const seriesTitle = (lang === "en" && post.series.title_en) ? post.series.title_en : post.series.title;
  return `${seriesTitle} #${post.series_order + 1} - ${title}`;
}

/**
 * 언어에 맞는 excerpt 반환.
 */
export function getPostExcerpt(post: Post, lang?: "ko" | "en"): string {
  return (lang === "en" && post.excerpt_en) ? post.excerpt_en : post.excerpt;
}
