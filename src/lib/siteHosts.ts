/**
 * 사이트 주소 — 포트폴리오(메인)와 블로그(서브도메인).
 *
 * 블로그는 같은 앱의 /posts 아래를 blog.hyeoniverse.com 으로도 보여 준다(proxy 가 처리):
 * - 블로그 주소의 `/` 는 `/posts` 를 그린다(주소는 그대로). `/posts/*` 는 그대로 그린다.
 * - 블로그 주소로 포트폴리오 화면(/works · /profile …)에 오면 메인 주소로 보낸다.
 * - BLOG_SUBDOMAIN_REDIRECT=1 이면 메인 주소의 /posts/* 를 블로그 주소로 보낸다(DNS · Vercel 도메인 연결 뒤에 켠다).
 */
const MAIN_HOSTS = ["hyeoniverse.com", "www.hyeoniverse.com"] as const;
const BLOG_HOST = "blog.hyeoniverse.com";
export const MAIN_ORIGIN = "https://hyeoniverse.com";
export const BLOG_ORIGIN = `https://${BLOG_HOST}`;

/** 요청 Host 헤더(포트 포함일 수 있음) → 호스트 이름(소문자) */
function hostnameOf(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].toLowerCase();
}

export function isBlogHost(host: string | null | undefined): boolean {
  return hostnameOf(host) === BLOG_HOST;
}

export function isMainHost(host: string | null | undefined): boolean {
  return (MAIN_HOSTS as readonly string[]).includes(hostnameOf(host));
}

/** 블로그 주소에서 포트폴리오로 나가는 링크 — 블로그 주소의 `/` 는 블로그 첫 화면이라 메인 주소를 붙여야 포트폴리오로 간다 */
export function portfolioHref(path: string, onBlogHost: boolean): string {
  return onBlogHost ? `${MAIN_ORIGIN}${path}` : path;
}
