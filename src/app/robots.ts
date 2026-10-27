import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo";

/* /robots.txt — 관리 화면 · API 는 색인하지 않는다. 블로그 주소(blog.)에서도 같은 파일이 나간다.
   사이트맵은 메인 주소 하나에 블로그 글 주소까지 담는다 — 서치 콘솔에 도메인 속성(hyeoniverse.com)으로 등록하면 둘 다 받아 준다 */
export default function robots(): MetadataRoute.Robots {
  return {
    // 탭 아이콘(/api/favicon)은 검색 결과 옆 아이콘으로 가져가므로 열어 둔다
    rules: { userAgent: "*", allow: ["/", "/api/favicon"], disallow: ["/admin", "/api/"] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
