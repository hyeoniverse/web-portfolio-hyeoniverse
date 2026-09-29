import { describe, expect, it } from "vitest";
import { captionCues, cueAt } from "@/lib/captionCues";

describe("captionCues", () => {
  it("문장마다 글자 수 비율로 시작 자리를 잡는다", () => {
    const cues = captionCues("짧은 문장입니다. 이것은 조금 더 긴 두 번째 문장입니다.");
    expect(cues.map((c) => c.text)).toEqual(["짧은 문장입니다.", "이것은 조금 더 긴 두 번째 문장입니다."]);
    expect(cues[0].start).toBe(0);
    expect(cues[1].start).toBeGreaterThan(0.2);
    expect(cues[1].start).toBeLessThan(0.5);
  });

  it("재생 자리에 맞는 자막을 고른다", () => {
    const cues = captionCues("하나입니다. 둘입니다. 셋입니다.");
    expect(cueAt(cues, 0)).toBe("하나입니다.");
    expect(cueAt(cues, 0.5)).toBe("둘입니다.");
    expect(cueAt(cues, 0.99)).toBe("셋입니다.");
  });

  it("긴 문장은 두 줄 안으로 끊는다", () => {
    const long = "가".repeat(60) + ", " + "나".repeat(60) + ".";
    expect(captionCues(long).every((c) => c.text.length <= 80)).toBe(true);
  });

  it("빈 대본은 자막이 없다", () => {
    expect(captionCues("")).toEqual([]);
    expect(cueAt([], 0.5)).toBe("");
  });
});

