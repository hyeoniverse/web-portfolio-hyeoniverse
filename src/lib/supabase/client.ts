import { createBrowserClient } from "@supabase/ssr";
import { sharedCookieDomain } from "@/lib/siteHosts";

export function createClient() {
  // 메인 · 블로그 주소가 같은 로그인을 보게 쿠키를 .hyeoniverse.com 에 둔다(로컬 · 프리뷰는 그 주소에만)
  const domain = sharedCookieDomain(window.location.host);
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined,
  );
}
