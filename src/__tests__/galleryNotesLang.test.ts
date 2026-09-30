import { describe, it, expect } from "vitest";
import { notesForLang, patchNote, readerNotes } from "@/lib/galleryNotes";

const notes = {
  "/a.png": { script: "안녕", audio: "/a-ko.mp3", en: { script: "Hello" } },
  "/b.png": { script: "둘째" },
};

describe("gallery notes by language", () => {
  it("편집 화면은 그 언어의 노트만", () => {
    expect(notesForLang(notes, "ko")["/a.png"]).toEqual({ script: "안녕", audio: "/a-ko.mp3" });
    expect(notesForLang(notes, "en")).toEqual({ "/a.png": { script: "Hello" } });
  });

  it("영어 칸에 쓰면 한국어 칸은 그대로", () => {
    const next = patchNote(notes, "/b.png", "en", { script: "Second" });
    expect(next["/b.png"]).toEqual({ script: "둘째", en: { script: "Second" } });
    const cleared = patchNote(next, "/b.png", "en", { script: "" });
    expect(cleared["/b.png"]).toEqual({ script: "둘째" });
  });

  it("영어로 볼 때 영어가 없는 장은 한국어로", () => {
    const r = readerNotes(notes, "en")!;
    expect(r["/a.png"].script).toBe("Hello");
    expect(r["/b.png"].script).toBe("둘째");
  });
});

describe("replaceGalleryUrl — 이미지 교체", () => {
  it("자리는 그대로, 대본·음성(두 언어)과 대표 이미지를 새 주소로 옮긴다", async () => {
    const { replaceGalleryUrl } = await import("@/lib/galleryNotes");
    const form = {
      gallery: ["a.png", "b.png", "c.png"],
      image: "b.png",
      gallery_notes: { "b.png": { script: "대본", audio: "b.mp3", en: { script: "script" } }, "c.png": { script: "셋" } },
    };
    const next = replaceGalleryUrl(form, "b.png", "b2.png");
    expect(next.gallery).toEqual(["a.png", "b2.png", "c.png"]);
    expect(next.image).toBe("b2.png");
    expect(next.gallery_notes).toEqual({ "b2.png": { script: "대본", audio: "b.mp3", en: { script: "script" } }, "c.png": { script: "셋" } });
  });

  it("대표 이미지가 아니면 그대로 두고, 없는 주소면 폼을 바꾸지 않는다", async () => {
    const { replaceGalleryUrl } = await import("@/lib/galleryNotes");
    const form = { gallery: ["a.png"], image: "cover.png", gallery_notes: {} };
    expect(replaceGalleryUrl(form, "a.png", "a2.png").image).toBe("cover.png");
    expect(replaceGalleryUrl(form, "zzz.png", "a2.png")).toBe(form);
  });
});
