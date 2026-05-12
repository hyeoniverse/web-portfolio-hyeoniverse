import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Supabase 미설정 시 미들웨어 스킵
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
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

  // 세션 갱신 (쿠키 리프레시 목적 — 반환값 사용하지 않음).
  // Supabase 가 일시적으로 unreachable (네트워크 끊김 / 프로젝트 paused / DNS 문제) 일 때
  // fetch 가 throw 하면서 middleware 전체가 500 으로 죽는 걸 방지 — silent 하게 통과.
  // 실제 인증 차단은 admin layout 의 session 체크에서 다시 수행됨.
  try {
    await supabase.auth.getUser();
  } catch {
    // network/fetch 실패 — 세션 갱신 skip, 통과
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
