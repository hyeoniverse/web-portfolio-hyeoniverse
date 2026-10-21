import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

/* 블로그 주소(blog.hyeoniverse.com)의 푸터 — `/` 는 블로그 첫 화면이라, Home 이 메인 주소를 붙이지 않으면 블로그에 머물렀다 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/posts",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/hooks/useIsBlogHost", () => ({ useIsBlogHost: () => true }));
vi.mock("@/providers/SiteConfigProvider", async () => {
  const { siteConfig } = await import("@/config/site.config");
  return { useSiteConfig: () => siteConfig };
});
vi.mock("@/providers/LanguageProvider", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "ko" }),
}));

const { default: Footer } = await import("@/components/layout/Footer");

Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

describe("레이아웃 푸터 — 블로그 주소", () => {
  it("Home · 포트폴리오 화면 링크는 메인 주소로 간다", () => {
    const { container } = render(<Footer />);
    const hrefOf = (label: string) =>
      [...container.querySelectorAll("a")].find((a) => a.textContent === label)?.getAttribute("href");
    expect(hrefOf("Home")).toBe("https://www.hyeoniverse.com/");
    expect(hrefOf("Works")).toBe("https://www.hyeoniverse.com/works");
    expect(hrefOf("About")).toBe("https://www.hyeoniverse.com/about");
    expect(hrefOf("Privacy Policy")).toBe("https://www.hyeoniverse.com/privacy");
    expect(hrefOf("Posts")).toBe("/posts");
  });
});
