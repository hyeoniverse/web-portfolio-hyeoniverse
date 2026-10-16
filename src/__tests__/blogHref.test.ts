import { afterEach, describe, expect, it, vi } from "vitest";

/* 글 링크 주소(lib/siteHosts) — 운영(NEXT_PUBLIC_BLOG_LINKS=1)에서는 블로그 주소의 짧은 주소로, 그 밖은 앱 경로 그대로.
   값이 모듈을 읽을 때 굳으므로 환경 변수를 바꾼 뒤 모듈을 새로 불러온다 */
async function load(blogLinks: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BLOG_LINKS", blogLinks ? "1" : "");
  return import("@/lib/siteHosts");
}

afterEach(() => { vi.unstubAllEnvs(); });

describe("blogHref", () => {
  it("운영에서는 /posts 를 뗀 블로그 주소로 그린다", async () => {
    const { blogHref } = await load(true);
    expect(blogHref("/posts")).toBe("https://blog.hyeoniverse.com/");
    expect(blogHref("/posts/hello")).toBe("https://blog.hyeoniverse.com/hello");
    expect(blogHref("/posts/tags/react")).toBe("https://blog.hyeoniverse.com/tags/react");
    expect(blogHref("/posts?category=dev")).toBe("https://blog.hyeoniverse.com/?category=dev");
    expect(blogHref("/posts/hello#comment-3")).toBe("https://blog.hyeoniverse.com/hello#comment-3");
  });

  it("/posts 밖 경로와 비슷한 이름은 건드리지 않는다", async () => {
    const { blogHref } = await load(true);
    expect(blogHref("/works/a")).toBe("/works/a");
    expect(blogHref("/postscript")).toBe("/postscript");
    expect(blogHref("/admin/posts/1/edit")).toBe("/admin/posts/1/edit");
    expect(blogHref("https://hyeoniverse.com/")).toBe("https://hyeoniverse.com/");
  });

  it("로컬 · 프리뷰에서는 앱 경로 그대로", async () => {
    const { blogHref } = await load(false);
    expect(blogHref("/posts/hello")).toBe("/posts/hello");
    expect(blogHref("/posts")).toBe("/posts");
  });
});

describe("블로그 주소 ↔ 앱 경로", () => {
  it("블로그 주소의 경로를 앱 경로로 읽는다 — API · 관리 · 로그인 콜백은 그대로", async () => {
    const { appPathOnBlogHost } = await load(true);
    expect(appPathOnBlogHost("/")).toBe("/posts");
    expect(appPathOnBlogHost("/hello")).toBe("/posts/hello");
    expect(appPathOnBlogHost("/?category=dev")).toBe("/posts?category=dev");
    expect(appPathOnBlogHost("/posts/hello")).toBe("/posts/hello");
    expect(appPathOnBlogHost("/api/posts")).toBe("/api/posts");
    expect(appPathOnBlogHost("/admin/posts")).toBe("/admin/posts");
    expect(appPathOnBlogHost("/auth/callback")).toBe("/auth/callback");
  });

  it("블로그 절대 주소만 앱 경로로 되돌린다", async () => {
    const { appPathOfHref } = await load(true);
    expect(appPathOfHref("https://blog.hyeoniverse.com/hello")).toBe("/posts/hello");
    expect(appPathOfHref("https://blog.hyeoniverse.com")).toBe("/posts");
    expect(appPathOfHref("https://blog.hyeoniverse.com.evil.io/x")).toBe("https://blog.hyeoniverse.com.evil.io/x");
    expect(appPathOfHref("/works/a")).toBe("/works/a");
  });
});
