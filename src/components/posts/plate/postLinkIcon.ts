// ── 문서(post_link) 멘션 아이콘 해석 — 게시물 icon(이모지/이미지) 또는 cover, 캐시 ──
// 노드/HTML 에 아이콘이 저장돼 있지 않은 기존 멘션을 위해 slug 로 1회 조회 후 캐시.

const cache = new Map<string, string>();          // slug → icon(이모지 or URL), "" = 없음
const inflight = new Map<string, Promise<string>>();

/** 이미 조회된 아이콘 (동기) — 없으면 undefined */
export function cachedPostIcon(slug: string): string | undefined {
  return cache.get(slug);
}

/** 사전 세팅 (노드/HTML 에 저장돼 있던 아이콘) */
export function primePostIcon(slug: string, icon: string) {
  if (slug && !cache.has(slug)) cache.set(slug, icon || "");
}

/** slug 로 게시물 아이콘 조회 (캐시·중복요청 제거) */
export function fetchPostIcon(slug: string): Promise<string> {
  if (!slug) return Promise.resolve("");
  const hit = cache.get(slug);
  if (hit !== undefined) return Promise.resolve(hit);
  const pending = inflight.get(slug);
  if (pending) return pending;
  const p = fetch(`/api/posts?slug=${encodeURIComponent(slug)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const post = Array.isArray(j?.posts) ? j.posts[0] : null;
      const icon = String(post?.icon || post?.cover_image || post?.auto_cover_url || "");
      cache.set(slug, icon);
      inflight.delete(slug);
      return icon;
    })
    .catch(() => { cache.set(slug, ""); inflight.delete(slug); return ""; });
  inflight.set(slug, p);
  return p;
}

/** 아이콘 문자열이 이미지/미디어 URL 인지 (아니면 이모지) */
export function isImageIcon(icon: string): boolean {
  return /^(https?:|\/)/.test(icon);
}

/** 아이콘 URL 이 동영상인지 (cover 가 동영상이면 <img> 로 못 띄움 → <video>) */
export function isVideoIcon(icon: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(icon);
}
