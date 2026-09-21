import { describe, it, expect } from "vitest";
import { normalizeRoutePath } from "@/hooks/useRoutePathname";

/* Vercel 이 다시 그린(ISR) 홈은 주소가 "/index" 로 읽힌다 — 홈을 알아봐야 레이아웃 푸터가 숨는다(#1100) */
describe("주소 정리", () => {
  it('배포가 다시 그린 홈의 "/index" 를 "/" 로 읽는다', () => {
    expect(normalizeRoutePath("/index")).toBe("/");
  });

  it("다른 주소는 그대로 둔다 — /index 로 시작하는 다른 경로도", () => {
    expect(normalizeRoutePath("/")).toBe("/");
    expect(normalizeRoutePath("/works")).toBe("/works");
    expect(normalizeRoutePath("/posts/index-page")).toBe("/posts/index-page");
    expect(normalizeRoutePath("/index/extra")).toBe("/index/extra");
  });

  it("주소를 모르면 빈 문자열", () => {
    expect(normalizeRoutePath(null)).toBe("");
    expect(normalizeRoutePath(undefined)).toBe("");
  });
});
