/**
 * 글 목록에 그릴 커버 — 올린 커버가 없으면 글 제목으로 그린 공유 카드(app/og/posts/[slug])를 대신 쓴다.
 * 커버 없는 글이 목록에서 빈 판 · 그러데이션으로만 보여 어떤 글인지 알아보기 어려웠다.
 * 화면 쪽에서도 쓰므로 서버 전용 모듈(lib/seo)을 들이지 않는다.
 */

/** 커버 없는 글의 공유 카드 주소 — 수정 시각을 붙여 제목을 고치면 주소가 바뀐다(공유 미리보기 캐시) */
export function postCardImagePath(slug: string, updatedAt?: string | null): string {
  const v = updatedAt ? Date.parse(updatedAt) : NaN;
  return `/og/posts/${encodeURIComponent(slug)}${Number.isFinite(v) ? `?v=${v}` : ""}`;
}

/** 목록 카드의 커버 — 올린 커버, 없으면 제목 카드. 주소(slug)가 없으면 빈 문자열 */
export function postCoverOf(post: { slug?: string | null; cover_image?: string | null; updated_at?: string | null }): string {
  if (post.cover_image) return post.cover_image;
  return post.slug ? postCardImagePath(post.slug, post.updated_at) : "";
}

/** 사이트가 그린 제목 카드인가 — 이미 알맞은 크기의 PNG 이고 주소에 ?v= 가 붙어, 이미지 최적화를 거치지 않는다
    (Next 16 은 물음표가 붙은 로컬 그림을 localPatterns 없이 최적화하지 않는다) */
export function isPostCardImage(src: string | null | undefined): boolean {
  return !!src && src.startsWith("/og/posts/");
}

/** 제목 카드의 바탕색(lib/og/postCard 의 어두운 바탕에 가장 가까운 토큰) — 칸 비율이 달라 남는 곳을 이 색으로 채운다 */
export const POST_CARD_BG = "var(--bg-black)";

/** 목록 카드의 커버 — 설정(posts.coverFallback)이 og 일 때만 커버 없는 글에 제목 카드를 쓴다. 기본(gradient)은 올린 커버만 */
export function postListCoverOf(post: { slug?: string | null; cover_image?: string | null; updated_at?: string | null }, fallback: string | undefined): string {
  return fallback === "og" ? postCoverOf(post) : post.cover_image || "";
}
