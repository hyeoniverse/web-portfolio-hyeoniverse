import { describe, it, expect } from "vitest";
import { isPdfFile } from "@/lib/pdfToImages";
import { isPptxFile, isLegacyPptFile } from "@/lib/pptxToImages";

/* 갤러리에 발표 자료를 넣으면 쪽마다 그림으로 펼친다 — 어느 길로 보낼지는 파일 이름과 MIME 으로 가른다.
   끌어 놓으면 MIME 이 비는 브라우저가 있어 확장자만으로도 알아봐야 한다. 옛 .ppt 는 열 수 없어 따로 알린다. */

const file = (name: string, type = "") => new File(["x"], name, { type });

describe("갤러리 발표 자료 판별", () => {
  it("PPTX 는 MIME 이 비어도 확장자로 알아본다", () => {
    expect(isPptxFile(file("deck.pptx"))).toBe(true);
    expect(isPptxFile(file("DECK.PPTX"))).toBe(true);
    expect(isPptxFile(file("deck", "application/vnd.openxmlformats-officedocument.presentationml.presentation"))).toBe(true);
  });

  it("옛 .ppt 는 PPTX 로 치지 않고 따로 가른다", () => {
    const old = file("deck.ppt", "application/vnd.ms-powerpoint");
    expect(isPptxFile(old)).toBe(false);
    expect(isLegacyPptFile(old)).toBe(true);
    expect(isLegacyPptFile(file("deck.pptx"))).toBe(false);
  });

  it("PDF·그림은 발표 자료 길로 가지 않는다", () => {
    for (const f of [file("a.pdf", "application/pdf"), file("a.png", "image/png")]) {
      expect(isPptxFile(f)).toBe(false);
      expect(isLegacyPptFile(f)).toBe(false);
    }
    expect(isPdfFile(file("a.pdf"))).toBe(true);
  });
});
