const SLUG_RE = /^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/;

/** 제목에서 URL-safe slug 생성 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** slug 유효성 검증. 문제 있으면 에러 키 반환, 없으면 null */
export function validateSlug(slug: string): string | null {
  if (!slug.trim()) return null;
  if (slug !== slug.toLowerCase()) return "SLUG_UPPERCASE";
  if (/\s/.test(slug)) return "SLUG_SPACE";
  if (/--/.test(slug)) return "SLUG_DOUBLE_HYPHEN";
  if (/^-|-$/.test(slug)) return "SLUG_EDGE_HYPHEN";
  if (!SLUG_RE.test(slug)) return "SLUG_INVALID_CHAR";
  if (slug.length > 80) return "SLUG_TOO_LONG";
  return null;
}
