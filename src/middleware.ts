import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith("/api/admin");
}

function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function rejectPage(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

function rejectApi(status: number, message: string): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isSameOrigin(request: NextRequest): boolean {
  if (!SITE_ORIGIN) {
    // production 에서 env 미설정은 fail-closed — 모든 mutation 차단해서 잘못된 배포가 즉시 드러나게
    // dev 는 localhost 포트 / IP 변동 때문에 skip (편의)
    return process.env.NODE_ENV !== "production";
  }
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;
  try {
    return new URL(source).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
}

function hasSupabaseCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

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

  let user: { id: string } | null = null;
  let authReachable = true;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    authReachable = false;
  }

  if (isAdminPath(pathname)) {
    if (!authReachable) {
      if (isAdminApi(pathname)) return rejectApi(503, "Auth service unavailable");
      return rejectPage(request);
    }
    if (!user) {
      if (isAdminApi(pathname)) return rejectApi(401, "Unauthorized");
      return rejectPage(request);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
