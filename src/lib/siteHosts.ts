/**
 * 사이트 주소 — 포트폴리오(메인)와 블로그(서브도메인).
 *
 * 블로그는 같은 앱의 /posts 아래를 blog.hyeoniverse.com 으로도 보여 준다(proxy 가 처리):
 * - 블로그 주소의 `/` 는 `/posts` 를 그린다(주소는 그대로). `/posts/*` 는 그대로 그린다.
 * - 블로그 주소로 포트폴리오 화면(/works · /profile …)에 오면 메인 주소로 보낸다.
 * - 로그인 쿠키는 .hyeoniverse.com 에 둬 두 주소가 같은 세션을 본다(sharedCookieDomain).
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

/** 관리 화면 경로인가 — "/admin" 이거나 "/admin/…". 접두어만 보면 블로그 짧은 주소의 글
 *  (blog.hyeoniverse.com/admin-two-factor-totp 처럼 슬러그가 admin 으로 시작)이 관리 화면으로 잡혀 로그인으로 보내졌다 */
export function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** 관리 API 경로인가 — "/api/admin" 이거나 "/api/admin/…" */
export function isAdminApiRoute(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

/** 블로그 주소에서도 앱 경로 그대로 여는 곳 — API · 관리 화면 · 로그인 콜백 */
export function passThroughOnBlogHost(pathname: string): boolean {
  return pathname.startsWith("/api/") || isAdminRoute(pathname) || pathname.startsWith("/auth/");
}

function isPostsPath(path: string): boolean {
  return path === "/posts" || path.startsWith("/posts/") || path.startsWith("/posts?") || path.startsWith("/posts#");
}

/** 앱 경로 → 블로그 주소의 짧은 경로 — /posts → /, /posts/x → /x, /posts?q → /?q. /posts 밖은 그대로 */
export function blogPathOf(appPath: string): string {
  if (!isPostsPath(appPath)) return appPath;
  const rest = appPath.slice("/posts".length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** 블로그 주소의 경로 → 앱 경로 — /x → /posts/x, / → /posts. API · 관리 · 로그인 콜백은 그대로(proxy rewrite 와 같은 규칙) */
export function appPathOnBlogHost(path: string): string {
  const cut = path.search(/[?#]/);
  const pathname = cut === -1 ? path : path.slice(0, cut);
  const tail = cut === -1 ? "" : path.slice(cut);
  if (passThroughOnBlogHost(pathname) || isPostsPath(pathname)) return path;
  return `${pathname === "/" ? "/posts" : `/posts${pathname}`}${tail}`;
}

/** 글 링크를 블로그 주소로 그리는지 — 운영 배포에서만 켜진다(next.config 의 NEXT_PUBLIC_BLOG_LINKS) */
const BLOG_LINKS = process.env.NEXT_PUBLIC_BLOG_LINKS === "1";

/**
 * 블로그(/posts 아래) 링크 — 운영에서는 블로그 주소의 짧은 주소(https://blog.hyeoniverse.com/x), 로컬 · 프리뷰는 앱 경로 그대로.
 * 늘 절대 주소라 서버 · 브라우저가 같은 값을 그린다. 블로그 주소 안에서는 같은 출처라 Next 가 그대로 화면 안 이동을 하고,
 * 메인 주소에서는 블로그로 넘어간다. /posts 밖 경로는 그대로 돌려준다
 */
export function blogHref(appPath: string): string {
  if (!BLOG_LINKS || !isPostsPath(appPath)) return appPath;
  return `${BLOG_ORIGIN}${blogPathOf(appPath)}`;
}

/** 링크 주소 → 앱 경로 — 블로그 주소의 절대 주소(https://blog.hyeoniverse.com/x)는 /posts/x 로 읽고, 그 밖은 그대로 */
export function appPathOfHref(href: string): string {
  if (!href.startsWith(BLOG_ORIGIN)) return href;
  const rest = href.slice(BLOG_ORIGIN.length);
  if (rest !== "" && !/^[/?#]/.test(rest)) return href;
  const path = rest.startsWith("/") ? rest : `/${rest}`;
  return appPathOnBlogHost(path);
}

/** 블로그 주소에서 포트폴리오로 나가는 링크 — 블로그 주소의 `/` 는 블로그 첫 화면이라 메인 주소를 붙여야 포트폴리오로 간다 */
export function portfolioHref(path: string, onBlogHost: boolean): string {
  return onBlogHost ? `${MAIN_ORIGIN}${path}` : path;
}

/** 로그인 쿠키를 함께 쓸 도메인 — 메인 · 블로그 주소에서 같은 세션을 보게 `.hyeoniverse.com` 에 둔다.
 *  그 밖의 주소(로컬 · Vercel 프리뷰)는 undefined — 지금처럼 그 주소에만 둔다 */
export function sharedCookieDomain(host: string | null | undefined): string | undefined {
  const name = hostnameOf(host);
  return name === "hyeoniverse.com" || name.endsWith(".hyeoniverse.com") ? ".hyeoniverse.com" : undefined;
}
