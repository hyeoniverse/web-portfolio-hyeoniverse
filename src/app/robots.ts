import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo";

/* /robots.txt — 관리 화면 · API 는 색인하지 않는다. 블로그 주소(blog.)에서도 같은 파일이 나가고,
   거기 글의 canonical 은 메인 주소를 가리키므로 따로 막지 않는다 */
export default function robots(): MetadataRoute.Robots {
  return {
    // 탭 아이콘(/api/favicon)은 검색 결과 옆 아이콘으로 가져가므로 열어 둔다
    rules: { userAgent: "*", allow: ["/", "/api/favicon"], disallow: ["/admin", "/api/"] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
