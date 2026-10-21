import { describe, expect, it } from "vitest";
import { shouldAutoAssignCover } from "@/lib/autoCoverImage";

/* 저장할 때 커버 자동 배정 — 처음 공개할 때만. 공개된 글에서 지운 커버가 저장할 때마다 다시 채워지던 버그 */
describe("shouldAutoAssignCover", () => {
  it("처음 공개하고 커버가 비면 채운다", () => {
    expect(shouldAutoAssignCover({ incomingCover: "", current: { published: false, cover_image: "" } })).toBe(true);
    expect(shouldAutoAssignCover({ incomingCover: undefined, current: { published: false, cover_image: null } })).toBe(true);
    expect(shouldAutoAssignCover({ incomingCover: undefined, current: null })).toBe(true);
  });

  it("이미 공개된 글은 커버를 비워 저장해도 채우지 않는다", () => {
    expect(shouldAutoAssignCover({ incomingCover: "", current: { published: true, cover_image: "https://x/old.jpg" } })).toBe(false);
    expect(shouldAutoAssignCover({ incomingCover: "", current: { published: true, cover_image: "" } })).toBe(false);
  });

  it("커버가 있으면 채우지 않는다", () => {
    expect(shouldAutoAssignCover({ incomingCover: "https://x/a.jpg", current: { published: false, cover_image: "" } })).toBe(false);
    expect(shouldAutoAssignCover({ incomingCover: undefined, current: { published: false, cover_image: "https://x/b.jpg" } })).toBe(false);
  });
});
