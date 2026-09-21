import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

/* 레이아웃 푸터는 홈("/")에서 숨는다 — 배포가 다시 그린 홈은 주소가 "/index" 로 읽혀도 숨어야 한다(#1100) */
let currentPath = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/providers/SiteConfigProvider", async () => {
  const { siteConfig } = await import("@/config/site.config");
  return { useSiteConfig: () => siteConfig };
});
vi.mock("@/providers/LanguageProvider", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "ko" }),
}));

const { default: Footer } = await import("@/components/layout/Footer");

/* 푸터는 글꼴이 준비되거나 크기가 바뀌면 밑줄 자리를 다시 잰다 — jsdom 에는 document.fonts 도 ResizeObserver 도 없다 */
Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

describe("레이아웃 푸터 — 홈에서 숨기", () => {
  beforeEach(() => { currentPath = "/"; });

  it.each(["/", "/index", "/works", "/about"])("%s 에서는 그리지 않는다", (path) => {
    currentPath = path;
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeNull();
  });

  it("다른 페이지에서는 그린다", () => {
    currentPath = "/posts";
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).not.toBeNull();
  });
});
