import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { sharedCookieDomain } from "@/lib/siteHosts";

export async function createClient() {
  const cookieStore = await cookies();
  // 메인 · 블로그 주소가 같은 로그인을 보게 쿠키를 .hyeoniverse.com 에 둔다(로컬 · 프리뷰는 그 주소에만)
  const domain = sharedCookieDomain((await headers()).get("host"));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(domain ? { cookieOptions: { domain } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서는 set-cookie 불가 — middleware에서 처리
          }
        },
      },
    }
  );
}
