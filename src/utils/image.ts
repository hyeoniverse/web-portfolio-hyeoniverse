/**
 * 이미지 URL에서 LQIP(Low Quality Image Placeholder) URL 생성
 * Unsplash: URL 파라미터 변경으로 20px 썸네일 요청
 * 기타: null 반환 (CSS shimmer 사용)
 */
export function getLqipUrl(src: string): string | null {
  if (!src) return null;

  // Unsplash
  if (src.includes("images.unsplash.com")) {
    try {
      const url = new URL(src);
      url.searchParams.set("w", "20");
      url.searchParams.set("q", "1");
      url.searchParams.delete("h");
      return url.toString();
    } catch {
      return null;
    }
  }

  return null;
}
