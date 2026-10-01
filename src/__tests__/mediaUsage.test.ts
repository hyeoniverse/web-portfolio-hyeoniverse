// @vitest-environment node
import { describe, it, expect } from "vitest";
import { findMediaUsage, mediaType } from "@/lib/mediaUsage";

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

describe("mediaType", () => {
  it("MIME·확장자로 종류", () => {
    expect(mediaType("image/png", "a.png")).toBe("image");
    expect(mediaType("audio/mpeg", "narration.mp3")).toBe("audio");
    expect(mediaType("", "font.woff2")).toBe("font");
    expect(mediaType("application/pdf", "resume.pdf")).toBe("doc");
    expect(mediaType("application/octet-stream", "x.bin")).toBe("other");
  });
});
