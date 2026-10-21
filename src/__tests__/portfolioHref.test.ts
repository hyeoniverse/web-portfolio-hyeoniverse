import { describe, expect, it } from "vitest";
import { blogNavItems } from "@/components/layout/Navigation/navigationData";
import { MAIN_ORIGIN, portfolioHref } from "@/lib/siteHosts";

/* 블로그 주소에서 포트폴리오로 나가는 링크(lib/siteHosts) — 블로그 주소의 `/` 는 블로그 첫 화면이라
   footer Home · 네비게이션 Portfolio 가 메인 주소를 붙이지 않으면 블로그에 머물렀다 */
describe("portfolioHref", () => {
  it("메인 주소는 대표 주소(www)다 — hyeoniverse.com 은 www 로 한 번 더 넘어간다", () => {
    expect(MAIN_ORIGIN).toBe("https://www.hyeoniverse.com");
  });

  it("블로그 주소에선 홈 · 포트폴리오 화면에 메인 주소를 붙인다", () => {
    expect(portfolioHref("/", true)).toBe("https://www.hyeoniverse.com/");
    expect(portfolioHref("/works", true)).toBe("https://www.hyeoniverse.com/works");
    expect(portfolioHref("/profile", true)).toBe("https://www.hyeoniverse.com/profile");
    expect(portfolioHref("/privacy?x=1", true)).toBe("https://www.hyeoniverse.com/privacy?x=1");
  });

  it("블로그 · 관리 경로는 블로그 주소에서도 그대로 둔다", () => {
    expect(portfolioHref("/posts", true)).toBe("/posts");
    expect(portfolioHref("/posts/series", true)).toBe("/posts/series");
    expect(portfolioHref("/admin", true)).toBe("/admin");
    expect(portfolioHref("/workshop", true)).toBe("/workshop");
  });

  it("메인 주소 · 로컬에선 앱 경로 그대로", () => {
    expect(portfolioHref("/", false)).toBe("/");
    expect(portfolioHref("/works", false)).toBe("/works");
  });

  it("블로그 메뉴의 Portfolio 는 작업물 목록으로 간다", () => {
    const item = blogNavItems.find((i) => i.key === "blog-portfolio");
    expect(item?.href).toBe("/works");
    expect(portfolioHref(item!.href, true)).toBe("https://www.hyeoniverse.com/works");
  });
});
