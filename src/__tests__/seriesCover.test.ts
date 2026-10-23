// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { writeFile } from "node:fs/promises";

/* 시리즈 자동 커버 — 제목으로 그린 그림을 WebP 로 저장소에 올리고 공개 주소를 돌려주는지. 설정 · 저장소는 흉내로.
   SERIES_COVER_OUT 을 주면 그 경로에 그림을 저장한다(눈으로 확인할 때) */
const uploads: { path: string; body: Buffer; contentType: string }[] = [];
const removed: string[][] = [];
vi.mock("@/lib/getSiteConfig", () => ({ getSiteConfig: async () => ({ metadata: { title: "HYEONIVERSE" }, theme: { accentColor: "#d40063" } }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: async (path: string, body: Buffer, opts: { contentType: string }) => { uploads.push({ path, body, contentType: opts.contentType }); return { error: null }; },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/uploads/${path}` } }),
        remove: async (paths: string[]) => { removed.push(paths); return { error: null }; },
      }),
    },
  }),
}));

describe("seriesCover", () => {
  it("제목으로 그려 series/auto- 이름의 WebP 로 올린다", async () => {
    const { createSeriesCover, isAutoSeriesCover } = await import("@/lib/seriesCover");
    const url = await createSeriesCover({ id: "abc", title: "hyeoniverse 개발기" });
    expect(uploads).toHaveLength(1);
    expect(uploads[0].path).toMatch(/^series\/auto-abc-\d+\.webp$/);
    expect(uploads[0].contentType).toBe("image/webp");
    expect(uploads[0].body.subarray(8, 12).toString()).toBe("WEBP");
    expect(isAutoSeriesCover(url)).toBe(true);
    if (process.env.SERIES_COVER_OUT) await writeFile(process.env.SERIES_COVER_OUT, uploads[0].body);
  }, 30_000);

  it("자동 커버만 지운다 — 올린 커버 · 바깥 주소는 그대로", async () => {
    const { removeAutoSeriesCover, isAutoSeriesCover } = await import("@/lib/seriesCover");
    expect(isAutoSeriesCover("https://x.supabase.co/storage/v1/object/public/uploads/covers/me.webp")).toBe(false);
    expect(isAutoSeriesCover("")).toBe(false);
    await removeAutoSeriesCover("https://images.unsplash.com/photo-1");
    expect(removed).toHaveLength(0);
    await removeAutoSeriesCover("https://x.supabase.co/storage/v1/object/public/uploads/series/auto-abc-1.webp");
    expect(removed).toEqual([["series/auto-abc-1.webp"]]);
  });
});
