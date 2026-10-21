// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import { renderPostCard, OG_SIZE } from "@/lib/og/postCard";
import { postCardImagePath } from "@/lib/seo";

/* 커버 없는 글의 공유 카드 — 한글 제목이 글꼴 파일로 그려져 1200×630 PNG 가 나오는지.
   OG_CARD_OUT 을 주면 그 경로에 그림을 저장한다(눈으로 확인할 때) */
describe("renderPostCard", () => {
  it("한글 제목으로 1200×630 PNG 를 그린다", async () => {
    const res = await renderPostCard({
      title: "비밀번호가 새도 못 들어오게 — 관리자 로그인에 2단계 인증을 붙이며",
      category: "백엔드",
      tags: ["보안", "Supabase", "TOTP"],
      date: "2026-10-21",
      siteName: "HYEONIVERSE",
      host: "hyeoniverse.com",
      accent: "#d40063",
    });
    expect(res.headers.get("content-type")).toBe("image/png");
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(OG_SIZE.width);
    expect(png.readUInt32BE(20)).toBe(OG_SIZE.height);
    if (process.env.OG_CARD_OUT) await writeFile(process.env.OG_CARD_OUT, png);
  }, 30_000);
});

/* 라우트 — 공개 글이면 PNG, 없으면 404. 글 조회 · 설정은 흉내로 */
const post: { current: Record<string, unknown> | null } = { current: null };
vi.mock("@/lib/posts", () => ({ getPostBySlug: async () => post.current }));
vi.mock("@/lib/getSiteConfig", () => ({ getSiteConfig: async () => ({ metadata: { title: "HYEONIVERSE" }, theme: { accentColor: "#d40063" } }) }));

describe("GET /og/posts/[slug]", () => {
  const call = async (slug: string) => {
    const { GET } = await import("@/app/og/posts/[slug]/route");
    return GET(new Request(`http://local/og/posts/${slug}`), { params: Promise.resolve({ slug }) });
  };

  it("없는(또는 비공개) 글은 404", async () => {
    post.current = null;
    expect((await call("nope")).status).toBe(404);
  });

  it("공개 글은 캐시되는 PNG", async () => {
    post.current = { slug: "a", title: "제목", category: "백엔드", tags: ["보안"], created_at: "2026-10-21T00:00:00Z" };
    const res = await call("a");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  }, 30_000);
});

describe("postCardImagePath", () => {
  it("수정 시각을 v 로 붙여 제목을 고치면 주소가 바뀐다", () => {
    expect(postCardImagePath("my post", "2026-10-21T00:00:00Z")).toBe(`/og/posts/my%20post?v=${Date.parse("2026-10-21T00:00:00Z")}`);
    expect(postCardImagePath("a", null)).toBe("/og/posts/a");
  });
});
