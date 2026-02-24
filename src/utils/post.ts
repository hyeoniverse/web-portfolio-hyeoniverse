import type { Post } from "@/types/post";

/**
 * 시리즈에 속한 포스트의 제목을 "시리즈명 #N - 제목" 형식으로 반환.
 * 시리즈가 없으면 원본 제목 그대로 반환.
 */
export function formatPostTitle(post: Post): string {
  if (!post.series_id || !post.series) return post.title;
  return `${post.series.title} #${post.series_order} - ${post.title}`;
}
