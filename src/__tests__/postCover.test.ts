import { describe, expect, it } from "vitest";
import { isPostCardImage, postCoverOf } from "@/lib/postCover";
import { passThroughOnBlogHost } from "@/lib/siteHosts";

describe("postCoverOf — 목록 카드의 커버", () => {
  it("올린 커버가 있으면 그대로", () => {
    expect(postCoverOf({ slug: "a", cover_image: "https://x/y.png" })).toBe("https://x/y.png");
  });
  it("없으면 제목 카드(수정 시각을 붙인 주소)", () => {
    expect(postCoverOf({ slug: "my post", cover_image: "", updated_at: "2026-10-21T00:00:00Z" })).toBe(`/og/posts/my%20post?v=${Date.parse("2026-10-21T00:00:00Z")}`);
    expect(postCoverOf({ slug: "a", cover_image: null })).toBe("/og/posts/a");
  });
  it("주소가 없으면 빈 문자열", () => {
    expect(postCoverOf({ cover_image: "" })).toBe("");
  });
  it("제목 카드인지 가려낸다", () => {
    expect(isPostCardImage("/og/posts/a?v=1")).toBe(true);
    expect(isPostCardImage("/images/a.png")).toBe(false);
  });
  it("블로그 주소에서도 /og/ 는 앱 경로 그대로", () => {
    expect(passThroughOnBlogHost("/og/posts/a")).toBe(true);
    expect(passThroughOnBlogHost("/og-post")).toBe(false);
  });
});
