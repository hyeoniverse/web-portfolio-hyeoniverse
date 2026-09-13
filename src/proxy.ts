import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole } from "@/lib/api/roles";
import { AUTHOR_HOME, canOpenAdminPage } from "@/lib/adminAccess";
import { legacyWorkTarget, type WorkRef } from "@/lib/legacyWorkPath";

/**
 * 보안 layer 2개:
 *
 * 1. CSRF 방어 (`/api/*` mutation)
 *    모든 /api/* 의 POST/PATCH/PUT/DELETE 는 Origin/Referer 가 우리 사이트에서 온 것이어야 함.
 *    SameSite=Lax 만에 의존하지 않는 application-level 방어.
 *    same-origin 브라우저 fetch → Origin 자동 부여 → 통과.
 *    cross-origin / curl(Origin 없음) → 차단.
 *    GET 은 cookie CSRF 영향 없어 skip.
 *
 * 2. Admin 가드 (`/admin/*`, `/api/admin/*`)
 *    비인증 시 page redirect / API 401. Supabase unreachable 시에도 fail-closed.
 *    layout / route 의 requireAuth() 와 다층 방어.
 *    권한이 모자란 화면(작성자의 대시보드·알림·신고 등, lib/adminAccess)은 글 목록으로 보낸다. API 는 route 가 판정한다.
 *
 * 3. 작업물 옛 주소(`/works/<id>`, `/works/01`) → slug 주소
 *    상세는 미리 그려 캐시한다(ISR, #909). 그 안에서 redirect() 를 부르면 캐시가 없는 첫 요청에 Location 이 두 번 실려
 *    (vercel/next.js#82117) 헤더를 합치는 곳을 거치면 "/works/a, /works/a" 로 이동한다. 그래서 그리기 전에 여기서 보낸다.
 *    matcher 가 id(UUID)·번호 모양의 주소만 보내므로 slug 주소에는 끼지 않는다.
 *
 * 비-admin 경로에서도 admin 이 로그인 중이면 Supabase 토큰 refresh 가 필요해 supabase 클라이언트는
 * 만들지만, 토큰 쿠키가 없을 땐 getUser() 호출도 skip — 익명 트래픽 hot path 의 불필요한
 * Supabase 왕복 제거.
 */

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

/** 인증 가드 제외 경로 — 비로그인 사용자가 접근 가능해야 하는 admin 영역.
 *  /admin/login: 로그인 페이지 (자기 자신으로 무한 리다이렉트 방지)
 *  /api/admin/auth: 로그인/로그아웃 endpoint (비인증 상태에서 호출됨)
 *  /api/admin/auth/approve-device: 이메일 링크 — 비인증 상태에서 token 으로 새 기기 승인
 *  /admin/denied: 거부 페이지 */
function isAdminAuthPublic(pathname: string): boolean {
  return pathname === "/admin/login"
    || pathname.startsWith("/admin/login/")
    || pathname === "/admin/denied"
    || pathname.startsWith("/admin/denied/")
    || pathname === "/api/admin/auth"
    || pathname === "/api/admin/auth/approve-device";
}

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith("/api/admin");
}

function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function rejectPage(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

/** 다른 화면으로 보내되, getUser() 가 토큰을 새로 받았으면 그 쿠키를 옮겨 싣는다 — 빠뜨리면 브라우저에 옛 토큰이 남는다 */
function redirectKeepingSession(request: NextRequest, to: string, sessionResponse: NextResponse): NextResponse {
  const response = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of sessionResponse.cookies.getAll()) response.cookies.set(cookie);
  return response;
}

function rejectApi(status: number, message: string): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isSameOrigin(request: NextRequest): boolean {
  const source = request.headers.get("origin") ?? request.headers.get("referer");

  // localhost 요청은 무조건 통과 — 외부에서 localhost 로 CSRF 도달 불가능.
  // dev (next dev) 든 local prod (next build && start) 든, 또 SITE_ORIGIN 이 배포 도메인으로 박혀있어도 동작.
  if (source) {
    try {
      const host = new URL(source).hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".localhost")) {
        return true;
      }
    } catch {
      /* URL parse 실패 → 아래 로직으로 fallthrough */
    }
  }

  // dev 모드는 무조건 통과 (편의)
  if (process.env.NODE_ENV !== "production") return true;

  if (!SITE_ORIGIN) {
    // prod 에서 env 미설정은 fail-closed — 모든 mutation 차단해서 잘못된 배포가 즉시 드러나게
    return false;
  }
  if (!source) return false;
  try {
    return new URL(source).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
}

/** matcher 가 보낸 작업물 옛 주소. 공개 작업물만 읽는다(anon — RLS works_public_read). 조회에 실패하면 그대로 넘기고,
    상세 레이아웃이 같은 판단을 한 번 더 한다 */
async function redirectLegacyWork(request: NextRequest, param: string): Promise<NextResponse> {
  try {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/works?select=id,slug,sort_order&published=is.true&deleted_at=is.null`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (res.ok) {
      const target = legacyWorkTarget((await res.json()) as WorkRef[], decodeURIComponent(param));
      if (target) {
        const to = request.nextUrl.clone();
        to.pathname = `/works/${target}`;
        return NextResponse.redirect(to, 307);
      }
    }
  } catch {
    /* 그대로 넘긴다 */
  }
  return NextResponse.next({ request });
}

function hasSupabaseCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  // ── 0. 작업물 옛 주소 ──
  const legacyWork = /^\/works\/([^/]+)$/.exec(pathname);
  if (legacyWork) return redirectLegacyWork(request, legacyWork[1]);

  // ── 1. CSRF: /api/* mutation 은 same-origin 만 ──
  if (isApi(pathname) && MUTATION_METHODS.has(request.method)) {
    if (!isSameOrigin(request)) {
      return rejectApi(403, "Cross-origin request blocked");
    }
  }

  // ── 2. Admin 가드 + 세션 cookie refresh ──
  // 익명 트래픽 fast path: admin 경로도 아니고 supabase 쿠키도 없으면 supabase 클라이언트 자체를 만들지 않음
  if (!isAdminPath(pathname) && !hasSupabaseCookie(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: User | null = null;
  let authReachable = true;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    authReachable = false;
  }

  if (isAdminPath(pathname) && !isAdminAuthPublic(pathname)) {
    if (!authReachable) {
      if (isAdminApi(pathname)) return rejectApi(503, "Auth service unavailable");
      return rejectPage(request);
    }
    if (!user) {
      if (isAdminApi(pathname)) return rejectApi(401, "Unauthorized");
      return rejectPage(request);
    }
    // 권한이 모자란 화면은 그리기 전에 보낸다(#883). 메일 링크 로그인은 /admin(대시보드)으로 들어오는데, 작성자는 그동안
    // 대시보드를 불러와 403 을 받은 뒤에야 글 목록으로 넘어갔고, 알림·신고는 빈 목록으로 보였다
    if (!isAdminApi(pathname) && !canOpenAdminPage(pathname, getUserRole(user))) {
      return redirectKeepingSession(request, AUTHOR_HOME, supabaseResponse);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    // 작업물 옛 주소 — id(UUID)·표시 번호 모양만. slug 주소는 proxy 를 거치지 않는다
    "/works/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
    "/works/:num(\\d{1,3})",
  ],
};
