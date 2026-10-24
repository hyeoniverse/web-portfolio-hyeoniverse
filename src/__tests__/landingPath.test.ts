import { describe, expect, it } from "vitest";
import { isLandingPath } from "@/components/works/landing/registry";

describe("isLandingPath — 간략 메뉴를 쓰는 경로", () => {
  it("모든 작업물 상세", () => {
    expect(isLandingPath("/works/hyeoniverse")).toBe(true);
    expect(isLandingPath("/works/macfolio/")).toBe(true);
    expect(isLandingPath("/works/other")).toBe(true);
  });

  it("목록 · 하위 경로는 아니다", () => {
    expect(isLandingPath("/works")).toBe(false);
    expect(isLandingPath("/works/hyeoniverse/edit")).toBe(false);
  });
});
