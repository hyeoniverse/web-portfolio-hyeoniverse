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
