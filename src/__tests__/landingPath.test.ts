import { describe, expect, it } from "vitest";
import { isLandingPath } from "@/components/works/landing/registry";

describe("isLandingPath — 간략 메뉴를 쓰는 경로", () => {
  it("설정이 랜딩이면 모든 작업물 상세", () => {
    expect(isLandingPath("/works/hyeoniverse", "landing")).toBe(true);
    expect(isLandingPath("/works/macfolio/", "landing")).toBe(true);
    expect(isLandingPath("/works/other", "landing")).toBe(true);
  });

  it("게시물 형태 설정 · 다른 경로는 아니다", () => {
    expect(isLandingPath("/works/hyeoniverse", "article")).toBe(false);
    expect(isLandingPath("/works/hyeoniverse", undefined)).toBe(false);
    expect(isLandingPath("/works", "landing")).toBe(false);
    expect(isLandingPath("/works/hyeoniverse/edit", "landing")).toBe(false);
  });
});
