// @vitest-environment node
import { describe, it, expect } from "vitest";
import { findMediaUsage, indexMediaUsage, mediaType, pageMedia } from "@/lib/mediaUsage";

/* 라이브러리 › 업로드한 파일 — 저장 경로가 어디에 나오는지 */

describe("findMediaUsage", () => {
  const sources = [
    { kind: "post" as const, id: "p1", title: "글", text: '{"content":"<img src=\\"https://x.supabase.co/storage/v1/object/public/posts/posts/a.jpg\\">"}' },
    { kind: "settings" as const, text: '{"brand":{"logo":"https://x/storage/v1/object/public/uploads/logos/1.png"}}' },
    { kind: "emoji" as const, text: '[{"src":"https://x/uploads/emojis/2.png"}]' },
  ];
  it("경로가 든 곳을 모은다", () => {
    const u = findMediaUsage(["posts/a.jpg", "logos/1.png", "emojis/2.png", "posts/zzz.jpg"], sources);
    expect(u.get("posts/a.jpg")).toEqual([{ kind: "post", id: "p1", title: "글" }]);
    expect(u.get("logos/1.png")).toEqual([{ kind: "settings" }]);
    expect(u.get("emojis/2.png")).toEqual([{ kind: "emoji" }]);
    expect(u.get("posts/zzz.jpg")).toEqual([]);
  });
});

describe("indexMediaUsage", () => {
  it("한 번 훑은 색인이 findMediaUsage 와 같은 답을 낸다", () => {
    const sources = [
      { kind: "post" as const, id: "p1", title: "글", text: '{"content":"<img src=\\"https://x.supabase.co/storage/v1/object/public/posts/posts/a.jpg?w=10\\">"}' },
      { kind: "settings" as const, text: '{"brand":{"logo":"https://x/storage/v1/object/public/uploads/logos/1.png"}}' },
      { kind: "work" as const, id: "w1", text: '{"image":"https://x/storage/v1/render/image/public/posts/posts/a.jpg"}' },
      { kind: "emoji" as const, text: '[{"src":"https://x/storage/v1/object/public/uploads/emojis/%ED%95%9C.png"}]' },
    ];
    const idx = indexMediaUsage(sources);
    expect(idx.get("posts/a.jpg")).toEqual([{ kind: "post", id: "p1", title: "글" }, { kind: "work", id: "w1" }]);
    expect(idx.get("logos/1.png")).toEqual([{ kind: "settings" }]);
    expect(idx.get("emojis/한.png")).toEqual([{ kind: "emoji" }]);
    expect(idx.get("posts/zzz.jpg")).toBeUndefined();
  });
});

describe("pageMedia", () => {
  const f = (path: string, mime: string, used: boolean, size = 10) => ({ path, name: path.split("/").pop()!, mime, size, usage: used ? [{}] : [] });
  const all = [f("posts/a.jpg", "image/jpeg", true), f("posts/b.mp3", "audio/mpeg", false, 5), f("logos/c.png", "image/png", false), f("fonts/d.woff2", "", true)];
  it("거르고 쪽을 나누며, 개수는 거르기 전 전체로 센다", () => {
    const r = pageMedia(all, { kind: "image", limit: 1, page: 2 });
    expect(r.items.map((m) => m.path)).toEqual(["logos/c.png"]);
    expect(r).toMatchObject({ total: 2, page: 2, totalPages: 2 });
    expect(r.summary).toEqual({ counts: { all: 4, image: 2, audio: 1, font: 1 }, totalSize: 35, unusedCount: 2, unusedSize: 15 });
  });
  it("안 쓰는 것만·검색, 넘친 쪽은 마지막 쪽으로", () => {
    expect(pageMedia(all, { unused: true }).items.map((m) => m.path)).toEqual(["posts/b.mp3", "logos/c.png"]);
    expect(pageMedia(all, { q: "LOGOS" }).total).toBe(1);
    expect(pageMedia(all, { limit: 3, page: 9 }).page).toBe(2);
  });
});

describe("mediaType", () => {
  it("MIME·확장자로 종류", () => {
    expect(mediaType("image/png", "a.png")).toBe("image");
    expect(mediaType("audio/mpeg", "narration.mp3")).toBe("audio");
    expect(mediaType("", "font.woff2")).toBe("font");
    expect(mediaType("application/pdf", "resume.pdf")).toBe("doc");
    expect(mediaType("application/octet-stream", "x.bin")).toBe("other");
  });
});
