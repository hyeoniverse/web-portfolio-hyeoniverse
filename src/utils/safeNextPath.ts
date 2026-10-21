/**
 * ?next= — 로그인 뒤 이동할 곳. 오픈 리다이렉트 방지로 같은 출처의 경로만 허용한다.
 *
 * "/" 로 시작하는지만 보면 "/\evil.com" 이 통과한다 — 브라우저가 "\" 를 "/" 로 읽어 "//evil.com"(다른 사이트)이 된다.
 * 그래서 실제 URL 로 풀어 출처가 같은지 보고, 경로 · 쿼리 · 해시만 돌려준다.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  const base = "https://same.origin";
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  if (url.origin !== base) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
