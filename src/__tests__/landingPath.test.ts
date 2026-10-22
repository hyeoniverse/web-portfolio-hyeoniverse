import { describe, expect, it } from "vitest";
import { isLandingPath } from "@/components/works/landing/registry";

describe("isLandingPath — 간략 메뉴를 쓰는 경로", () => {
  it("설정이 랜딩이고 전용 페이지가 있는 작업물 상세만", () => {
    expect(isLandingPath("/works/hyeoniverse", "landing")).toBe(true);
    expect(isLandingPath("/works/macfolio/", "landing")).toBe(true);
  });

  it("게시물 형태 설정 · 전용 페이지 없는 작업물 · 다른 경로는 아니다", () => {
    expect(isLandingPath("/works/hyeoniverse", "article")).toBe(false);
    expect(isLandingPath("/works/hyeoniverse", undefined)).toBe(false);
    expect(isLandingPath("/works/other", "landing")).toBe(false);
    expect(isLandingPath("/works", "landing")).toBe(false);
    expect(isLandingPath("/works/hyeoniverse/edit", "landing")).toBe(false);
  });
});
