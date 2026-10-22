/**
 * 문의 폼에 첨부할 수 있는 형식 — 이미지 · 문서 · 압축 파일. 문의 서랍(파일 고르기 accept · 안내)과 서버(/api/contact/upload)가 같이 쓴다.
 * 형식별 크기는 설정 › 미디어의 크기 제한(media.limits)을 따르고, 거기 없는 형식(hwp · doc 등)은 CONTACT_DEFAULT_MB 로 받는다.
 * 차단 확장자(media.blockedExtensions)에 든 형식은 받지 않는다.
 * 동영상 · 음성은 문의에 쓰기엔 크고, SVG 는 스크립트를 품을 수 있어 넣지 않는다.
 */
export const CONTACT_ATTACH_EXTS = [
  // 이미지
  "jpg", "jpeg", "png", "webp", "gif", "heic",
  // 문서
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "hwp", "hwpx", "txt", "md", "csv", "rtf", "key", "pages", "numbers",
  // 압축
  "zip",
] as const;

/** 첨부 버킷(contact-attachments)이 한 파일에 받는 한도 — 마이그레이션의 file_size_limit 와 같다 */
export const CONTACT_BUCKET_MAX_MB = 25;

/** media.limits 에 없는 형식의 한도(MB) */
export const CONTACT_DEFAULT_MB = 10;

/** 문의에 받는 형식 · 형식별 한도(MB) — media.limits 값(없으면 CONTACT_DEFAULT_MB)을 버킷 한도로 자른다 */
export function contactAttachLimits(limits: Record<string, number> | undefined, blocked: Iterable<string> = []): Record<string, number> {
  const deny = new Set(Array.from(blocked, (e) => e.toLowerCase()));
  const out: Record<string, number> = {};
  for (const ext of CONTACT_ATTACH_EXTS) {
    if (deny.has(ext)) continue;
    out[ext] = Math.min(limits?.[ext] ?? CONTACT_DEFAULT_MB, CONTACT_BUCKET_MAX_MB);
  }
  return out;
}

/** 파일 고르기 accept 값 — ".jpg,.png,…" */
export function contactAcceptAttr(allowed: Record<string, number>): string {
  return Object.keys(allowed).map((e) => `.${e}`).join(",");
}
